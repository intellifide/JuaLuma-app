# Updated 2025-12-08 17:53 CST by ChatGPT
from collections import deque
from threading import Lock
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.models import Subscription, User
from backend.services.auth import verify_token
from backend.utils import get_db

_plan_rank = {"free": 0, "essential": 1, "pro": 2, "ultimate": 3}


async def get_current_user(
    authorization: Annotated[str | None, Header(convert_underscores=False)] = None,
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and load the current user."""
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

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        logger.error("Auth Middleware: Token missing uid.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data.",
        )

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
                    return user_by_email
                except Exception as e:
                    logger.error(f"Auth Middleware: Healing failed for {email}: {e}")
                    # If PK update fails (e.g. FK constraints without cascade), rollback
                    db.rollback()
                    pass

        logger.error(f"Auth Middleware: User {uid} not found in DB and healing failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account session is invalid.",
        )

    return user


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
    "get_current_user",
    "require_role",
    "require_user",
    "require_support_agent",
    "require_support_manager",
    "require_tier",
    "register_login_attempt",
]
