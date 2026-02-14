# Updated 2025-12-08 17:53 CST by ChatGPT
from collections import deque
from threading import Lock
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.models import Subscription, User, UserSession
from backend.services.auth import verify_token
from backend.utils import get_db
from backend.utils.rls import set_db_user_context

_plan_rank = {"free": 0, "essential": 1, "pro": 2, "ultimate": 3}
_MFA_EXEMPT_PATH_PREFIXES = (
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/mfa/",
    "/api/auth/reset-password",
)
_MFA_SESSION_ROLLOVER_SECONDS = 6 * 60 * 60  # keep MFA verified across Firebase token refreshes


async def _verify_authorization_header(authorization: str | None) -> dict:
    """Helper to verify bearer token and return decoded claims."""
    import logging

    logger = logging.getLogger("backend.middleware.auth")

    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("Auth Middleware: Missing or invalid authorization header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        decoded = verify_token(token)
    except Exception as exc:
        logger.error(f"Auth Middleware: Token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again.",
        ) from exc
    
    return decoded


async def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header(convert_underscores=False)] = None,
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and load the current user."""
    import logging

    logger = logging.getLogger("backend.middleware.auth")

    decoded = await _verify_authorization_header(authorization)

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        logger.error("Auth Middleware: Token missing uid.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data.",
        )

    # Set RLS context for the session
    set_db_user_context(db, uid)

    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        logger.warning(
            f"Auth Middleware: User {uid} not found in DB. Checking for email match..."
        )
        # JIT Healing: Check if user exists by email (common in dev/reset scenarios)
        email = decoded.get("email")
        if email:
            logger.info(f"Auth Middleware: Checks for email {email}")
            user_by_email = db.query(User).filter(User.email == email).first()
            if user_by_email:
                # User exists but UID mismatched. Trust the fresh Firebase token.
                # Attempt to update the DB record to match the new UID.
                try:
                    logger.info(
                        f"Auth Middleware: Healing user {email}. Updating UID {user_by_email.uid} -> {uid}"
                    )
                    user_by_email.uid = uid
                    db.commit()
                    db.refresh(user_by_email)
                    user = user_by_email
                except Exception as e:
                    logger.error(f"Auth Middleware: Healing failed for {email}: {e}")
                    # If PK update fails (e.g. FK constraints without cascade), rollback
                    db.rollback()
                    pass

    if not user:
        logger.error(f"Auth Middleware: User {uid} not found in DB and healing failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account session is invalid.",
        )

    # Session Tracking Logic
    iat = decoded.get("iat")
    if iat:
        request.state.iat = iat
        # Check if the specific session is killed
        session_rec = db.query(UserSession).filter(
            UserSession.uid == uid, UserSession.iat == iat
        ).first()
        
        if session_rec and not session_rec.is_active:
            logger.warning(f"Auth Middleware: Killed session attempt for user {uid}, iat {iat}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has been terminated. Please log in again.",
            )
        
        # Upsert session record (optional: only update if last_active is old to save writes)
        # For simplicity, we'll just update every time for now or use a strategy later.
        if not session_rec:
            # Create new session record
            import user_agents
            ua_string = request.headers.get("user-agent", "")
            ua = user_agents.parse(ua_string)
            device_type = "Desktop"
            if ua.is_mobile:
                device_type = "Mobile"
            elif ua.is_tablet:
                device_type = "Tablet"
            elif ua.is_bot:
                device_type = "Bot"
                
            session_rec = UserSession(
                uid=uid,
                iat=iat,
                ip_address=request.client.host if request.client else None,
                user_agent=ua_string[:512],
                device_type=device_type,
                # Location would require GeoIP, leaving null for now or mock
                is_active=True
            )
            db.add(session_rec)
        else:
            # Update last active
            session_rec.last_active = func.now()

        if user.mfa_enabled:
            path = str(request.url.path or "")
            is_exempt = any(path.startswith(prefix) for prefix in _MFA_EXEMPT_PATH_PREFIXES)

            # Firebase ID tokens can be refreshed periodically, which changes `iat`.
            # That would create a "new" session row and incorrectly force MFA again.
            # Roll MFA verification forward for the same device if we recently verified.
            if session_rec.mfa_verified_at is None and not is_exempt:
                recent_verified = (
                    db.query(UserSession)
                    .filter(
                        UserSession.uid == uid,
                        UserSession.is_active == True,  # noqa: E712 - SQLAlchemy bool
                        UserSession.iat != iat,
                        UserSession.mfa_verified_at.isnot(None),
                        UserSession.user_agent == session_rec.user_agent,
                        UserSession.ip_address == session_rec.ip_address,
                    )
                    .order_by(UserSession.mfa_verified_at.desc())
                    .first()
                )
                if recent_verified and recent_verified.mfa_method_verified == user.mfa_method:
                    import datetime as _dt

                    now = _dt.datetime.now(_dt.UTC)
                    if (now - recent_verified.mfa_verified_at).total_seconds() <= _MFA_SESSION_ROLLOVER_SECONDS:
                        session_rec.mfa_verified_at = recent_verified.mfa_verified_at
                        session_rec.mfa_method_verified = recent_verified.mfa_method_verified
                        db.add(session_rec)
                        db.commit()

            if not is_exempt and session_rec.mfa_verified_at is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="MFA_REQUIRED",
                )

            if (
                session_rec.mfa_verified_at is not None
                and session_rec.mfa_method_verified != user.mfa_method
            ):
                session_rec.mfa_verified_at = None
                session_rec.mfa_method_verified = None
                db.add(session_rec)
                db.commit()
                if not is_exempt:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="MFA_REQUIRED",
                    )
        
        try:
            db.commit()
        except Exception as e:
            logger.error(f"Auth Middleware: Failed to update session for {uid}: {e}")
            db.rollback()

    return user


async def get_current_identity(
    request: Request,
    authorization: Annotated[str | None, Header(convert_underscores=False)] = None,
) -> dict:
    """
    Validate bearer token and return identity claims (uid, email).
    
    Does NOT require a User record in the database.
    Does NOT enforce MFA or Session verification.
    """
    decoded = await _verify_authorization_header(authorization)
    uid = decoded.get("uid") or decoded.get("sub")
    
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data.",
        )

    return {"uid": uid, "email": decoded.get("email")}


async def get_current_identity_with_user_guard(
    request: Request,
    authorization: Annotated[str | None, Header(convert_underscores=False)] = None,
    db: Session = Depends(get_db),
) -> dict:
    """
    Validate bearer token and return identity claims.

    - For pending signups (no local User), only token validation is required.
    - For existing users, enforce strict session + MFA checks via get_current_user.
    """
    decoded = await _verify_authorization_header(authorization)
    uid = decoded.get("uid") or decoded.get("sub")
    email = decoded.get("email")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data.",
        )

    existing_user = (
        db.query(User)
        .filter(or_(User.uid == uid, User.email == email) if email else User.uid == uid)
        .first()
    )
    if not existing_user:
        return {"uid": uid, "email": email}

    strict_user = await get_current_user(request, authorization, db)
    return {"uid": strict_user.uid, "email": strict_user.email}


def require_role(allowed_roles: list[str]):
    """Factory that enforces allowed roles."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return dependency


async def require_user(
    user: User = Depends(require_role(["user", "support_agent", "support_manager"])),
) -> User:  # type: ignore[arg-type]
    return user


async def require_support_agent(
    user: User = Depends(require_role(["support_agent", "support_manager"])),
) -> User:  # type: ignore[arg-type]
    return user


async def require_support_manager(
    user: User = Depends(require_role(["support_manager"])),
) -> User:  # type: ignore[arg-type]
    return user


async def require_tier(
    min_tier: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    """Ensure the requester meets the minimum subscription tier."""
    subscription = db.query(Subscription).filter(Subscription.uid == user.uid).first()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="An active subscription is required to access this feature.",
        )

    user_rank = _plan_rank.get(subscription.plan, -1)
    required_rank = _plan_rank.get(min_tier, -1)

    if required_rank == -1:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We encountered a configuration error while verifying your plan. Please contact support.",
        )

    if user_rank < required_rank:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Please upgrade to the {min_tier.capitalize()} tier to access this feature.",
        )

    return subscription


LOGIN_RATE_LIMIT: dict[str, deque[float]] = {}
LOGIN_LOCK = Lock()
LOGIN_WINDOW_SECONDS = 60
LOGIN_MAX_ATTEMPTS = 10


def register_login_attempt(request: Request) -> None:
    """Track login attempts per client IP to enforce rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    now = request.state.timestamp if hasattr(request.state, "timestamp") else None

    # Fallback if middleware did not add timestamp
    import time

    current_ts = now or time.time()

    with LOGIN_LOCK:
        attempts = LOGIN_RATE_LIMIT.setdefault(client_ip, deque())
        while attempts and attempts[0] <= current_ts - LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        attempts.append(current_ts)

        if len(attempts) > LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts have been made. Please wait a moment and try again.",
            )


__all__ = [
    "get_current_identity",
    "get_current_identity_with_user_guard",
    "get_current_user",
    "require_role",
    "require_user",
    "require_support_agent",
    "require_support_manager",
    "require_tier",
    "register_login_attempt",
]
