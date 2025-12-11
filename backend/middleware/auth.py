# Updated 2025-12-08 17:53 CST by ChatGPT
from collections import deque
from threading import Lock
from typing import Annotated, Deque, Dict, List

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
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header.",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        decoded = verify_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing uid.",
        )

    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        # JIT Healing: Check if user exists by email (common in dev/reset scenarios)
        email = decoded.get("email")
        if email:
            user_by_email = db.query(User).filter(User.email == email).first()
            if user_by_email:
                # User exists but UID mismatched. Trust the fresh Firebase token.
                # Attempt to update the DB record to match the new UID.
                try:
                    user_by_email.uid = uid
                    db.commit()
                    db.refresh(user_by_email)
                    return user_by_email
                except Exception:
                    # If PK update fails (e.g. FK constraints without cascade), rollback
                    db.rollback()
                    pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


def require_role(allowed_roles: List[str]):
    """Factory that enforces allowed roles."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this operation.",
            )
        return user

    return dependency


async def require_user(user: User = Depends(require_role(["user", "support_agent", "support_manager"]))) -> User:  # type: ignore[arg-type]
    return user


async def require_support_agent(user: User = Depends(require_role(["support_agent", "support_manager"]))) -> User:  # type: ignore[arg-type]
    return user


async def require_support_manager(user: User = Depends(require_role(["support_manager"]))) -> User:  # type: ignore[arg-type]
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
            detail="Subscription required for this feature.",
        )

    user_rank = _plan_rank.get(subscription.plan, -1)
    required_rank = _plan_rank.get(min_tier, -1)

    if required_rank == -1:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: unknown plan.",
        )

    if user_rank < required_rank:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Upgrade to {min_tier} to access this feature.",
        )

    return subscription


LOGIN_RATE_LIMIT: Dict[str, Deque[float]] = {}
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
                detail="Too many login attempts. Try again in a minute.",
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
