# Updated 2025-12-10 16:46 CST by ChatGPT
import logging
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy.orm import Session, selectinload

from backend.middleware.auth import get_current_user
from backend.models import AuditLog, Subscription, User
from backend.services.auth import (
    _get_firebase_app,
    create_user_record,
    generate_password_reset_link,
    revoke_refresh_tokens,
    verify_token,
)
from backend.utils import get_db

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    email: EmailStr = Field(example="user@example.com")
    password: str = Field(min_length=8, max_length=128, example="Str0ngPass!")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"email": "fin.user@example.com", "password": "MyS3curePass!"},
            ]
        }
    )


class TokenRequest(BaseModel):
    token: str = Field(min_length=10, example="eyJhbGciOiJSUzI1NiIsImtpZCI6...")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...sample"}]
        }
    )


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(example="user@example.com")

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"email": "forgot@example.com"}]}
    )


class ProfileUpdateRequest(BaseModel):
    theme_pref: Optional[str] = Field(default=None, max_length=32, example="dark")
    currency_pref: Optional[str] = Field(
        default=None, min_length=3, max_length=3, example="USD"
    )

    @model_validator(mode="after")
    def at_least_one_field(self) -> "ProfileUpdateRequest":
        if not self.theme_pref and not self.currency_pref:
            raise ValueError("Provide at least one field to update.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"theme_pref": "dark", "currency_pref": "USD"},
                {"currency_pref": "EUR"},
            ]
        }
    )


# Structured helpers ---------------------------------------------------------
def _serialize_profile(user: User) -> dict:
    """Build a complete profile payload."""
    subscriptions = [
        {
            "id": str(sub.id),
            "plan": sub.plan,
            "status": sub.status,
            "renew_at": sub.renew_at,
            "ai_quota_used": sub.ai_quota_used,
            "created_at": sub.created_at,
            "updated_at": sub.updated_at,
        }
        for sub in (user.subscriptions or [])
    ]

    ai_settings = None
    if user.ai_settings:
        ai_settings = {
            "id": str(user.ai_settings.id),
            "provider": user.ai_settings.provider,
            "model_id": user.ai_settings.model_id,
            "user_dek_ref": user.ai_settings.user_dek_ref,
            "created_at": user.ai_settings.created_at,
            "updated_at": user.ai_settings.updated_at,
        }

    profile = user.to_dict()
    profile["subscriptions"] = subscriptions
    profile["ai_settings"] = ai_settings
    profile["is_developer"] = True if user.developer else False
    return profile


# Simple in-memory rate limiter keyed by client IP
_login_attempts: Dict[str, Deque[float]] = defaultdict(deque)
_login_lock = Lock()
_login_window_seconds = 60
_login_max_attempts = 10


def _rate_limit(request: Request) -> None:
    import time

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    with _login_lock:
        attempts = _login_attempts[client_ip]
        while attempts and attempts[0] <= now - _login_window_seconds:
            attempts.popleft()
        if len(attempts) >= _login_max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please wait before retrying.",
            )
        attempts.append(now)


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> dict:
    """
    Register a new user in Firebase and the local database.

    - **email**: Valid email address.
    - **password**: Password (min 8 chars).

    Returns the new user's UID and email.
    """
    from firebase_admin import auth
    from firebase_admin import exceptions as firebase_exceptions

    try:
        # 2025-12-10 16:46 CST - ensure emulator/SDK is initialized before create_user
        _get_firebase_app()
        record = auth.create_user(
            email=payload.email, password=payload.password
        )
    except firebase_exceptions.AlreadyExistsError:
        # 2025-12-10: Handle "Zombie" users (exist in Auth, missing in DB)
        try:
            # 1. Fetch existing Auth record
            existing_user = auth.get_user_by_email(payload.email)
            
            # 2. Check DB
            db_user = db.query(User).filter(User.uid == existing_user.uid).first()
            if db_user:
                 # Truly a duplicate
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists.",
                 )
            
            # 3. Heal (Create DB record for existing Auth user)
            logger.info(f"Healing zombie user account for {payload.email} ({existing_user.uid})")
            record = existing_user # Use existing record for next step
            
        except Exception as e:
            # If we can't fetch or heal, fall back to original error
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error healing user: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists.",
            )

    except firebase_exceptions.InvalidArgumentError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signup parameters.",
        ) from exc
    except firebase_exceptions.FirebaseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Firebase unavailable. Try again shortly.",
        ) from exc

    try:
        # Check if we already have the user (optimization if we strictly flowed from healing)
        # But create_user_record handles integrity error checks too.
        # However, we need to be careful not to re-create if we just found it in DB (handled above).
        
        # If we are here, 'record' is set (either new or fetched).
        
        # Double check if we need to query DB again? 
        # create_user_record does an insert.
        user = create_user_record(db, uid=record.uid, email=record.email)
    except ValueError as exc:
        # This catches expected IntegrityError wrapped as ValueError
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists.",
        ) from exc

    return {"uid": user.uid, "email": user.email, "message": "Signup successful."}


@router.post("/login")
def login(
    payload: TokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """
    Exchange a valid Firebase ID token for a user session profile.

    - **token**: The JWT ID token from the client SDK.

    Returns the full user profile including subscription status.
    """
    # Rate limit manually to avoid new dependencies
    _rate_limit(request)

    try:
        decoded = verify_token(payload.token)
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

    user = (
        db.query(User)
        .options(
             selectinload(User.developer)
        )
        .filter(User.uid == uid).first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    subscription = (
        db.query(Subscription).filter(Subscription.uid == uid).first()
    )

    profile = user.to_dict()
    if subscription:
        profile["plan"] = subscription.plan
        profile["subscription_status"] = subscription.status
    
    profile["is_developer"] = True if user.developer else False

    return {"user": profile}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict:
    """Generate and dispatch a password reset link."""
    try:
        reset_link = generate_password_reset_link(payload.email)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send reset link right now.",
        ) from exc

    logger.info("Password reset link for %s: %s", payload.email, reset_link)
    return {"message": "Reset link sent"}


@router.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the authenticated user's profile with preferences and subscriptions."""
    user = (
        db.query(User)
        .options(
            selectinload(User.subscriptions),
            selectinload(User.ai_settings),
            selectinload(User.notification_preferences),
            selectinload(User.developer),
        )
        .filter(User.uid == current_user.uid)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    return {"user": _serialize_profile(user)}


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update theme and currency preferences for the current user."""
    user = (
        db.query(User)
        .options(
            selectinload(User.subscriptions),
            selectinload(User.ai_settings),
            selectinload(User.notification_preferences),
        )
        .filter(User.uid == current_user.uid)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    if payload.theme_pref is not None:
        user.theme_pref = payload.theme_pref
    if payload.currency_pref is not None:
        user.currency_pref = payload.currency_pref.upper()

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"user": _serialize_profile(user)}


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke refresh tokens and record an audit log entry."""
    try:
        revoke_refresh_tokens(current_user.uid)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to revoke tokens right now.",
        ) from exc

    metadata = {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }

    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="logout",
        source="backend",
        metadata_json=metadata,
    )

    db.add(log_entry)
    db.commit()

    return {"message": "Logged out successfully"}


__all__ = ["router"]
