# Updated 2025-12-10 16:46 CST by ChatGPT
import logging
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict, Optional
import pyotp

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
from backend.services.email import get_email_client
from datetime import datetime, timedelta
import random
import string

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
    mfa_code: Optional[str] = Field(default=None, min_length=6, max_length=6, example="123456")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...sample", "mfa_code": "123456"}]
        }
    )


class MFAVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, example="123456")


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
        # 2025-12-12: Complete handling for "Zombie" users and "Desync" users
        try:
            # 1. Fetch existing Auth record to get the authoritative UID
            existing_user = auth.get_user_by_email(payload.email)
            
            # 2. Check DB by authoritative UID
            db_user_by_uid = db.query(User).filter(User.uid == existing_user.uid).first()
            if db_user_by_uid:
                 # Truly a duplicate (User exists in both with same UID)
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists.",
                 )
            
            # 3. Check DB by Email (Potential Desync)
            db_user_by_email = db.query(User).filter(User.email == payload.email).first()
            if db_user_by_email:
                # User exists in DB but with different UID. Heal it.
                logger.info(f"Healing desynced user {payload.email}. DB UID {db_user_by_email.uid} -> Auth UID {existing_user.uid}")
                try:
                    db_user_by_email.uid = existing_user.uid
                    db.commit()
                    db.refresh(db_user_by_email)
                    return {"uid": db_user_by_email.uid, "email": db_user_by_email.email, "message": "Account synced successfully."}
                except Exception as e:
                    logger.error(f"Failed to heal user {payload.email}: {e}")
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Account sync failed.",
                    )

            # 4. Truly "Zombie" (Exists in Auth, missing in DB)
            logger.info(f"Healing zombie user account for {payload.email} ({existing_user.uid})")
            # Proceed to create logic below using existing record
            record = existing_user 
            
        except Exception as e:
            # If we returned above, we won't get here.
            # If we raised HTTPException, it propagates.
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error checking user state: {e}")
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
        # Create DB record if we didn't return early (Zombie case or New user)
        # Note: If we fell through from Zombie case, 'record' is set. 
        # If we came from normal flow, 'record' is set in try block.
        if 'record' not in locals():
             # Should not happen unless logic above is flawed, but safe fallback
             raise RuntimeError("User record creation failed unexpectedly.")

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

    if user.mfa_enabled:
        if not payload.mfa_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA_REQUIRED",
            )
        
        # Verify code based on method
        method = user.mfa_method or "totp"
        
        if method == "totp":
            if not user.mfa_secret:
                 pass 
            else:
                totp = pyotp.TOTP(user.mfa_secret)
                if not totp.verify(payload.mfa_code):
                     # Fallback check: maybe it's an email code even if method says totp? (Optional, but stick to strict)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid MFA code",
                    )
        elif method == "email":
            # Check DB OTP
            if not user.email_otp or not user.email_otp_expires_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No OTP generated. Request a code first.",
                )
            if datetime.now(user.email_otp_expires_at.tzinfo) > user.email_otp_expires_at:
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OTP expired.",
                )
            # Simple check
            if payload.mfa_code != user.email_otp:
                 raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code",
                )
            # Consume OTP
            user.email_otp = None
            db.commit()
            
        elif method == "sms":
             # Placeholder for SMS
             raise HTTPException(status_code=501, detail="SMS MFA not implemented")

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


@router.post("/mfa/email/request-code")
def request_email_code(
    payload: ResetPasswordRequest, # reusing email field
    db: Session = Depends(get_db),
) -> dict:
    """Request an Email OTP for login or setup."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Prevent enumeration
        return {"message": "If account exists, code sent."}
    
    code = ''.join(random.choices(string.digits, k=6))
    user.email_otp = code
    user.email_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    # Send Email
    client = get_email_client()
    client.send_otp(user.email, code)
    
    return {"message": "Code sent."}


@router.post("/mfa/email/enable")
def enable_email_mfa(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Enable Email MFA by verifying a sent code."""
    if not current_user.email_otp or not current_user.email_otp_expires_at:
        raise HTTPException(status_code=400, detail="Request a code first.")
        
    # Timezone naive vs aware fix using utcnow/native
    if datetime.utcnow() > current_user.email_otp_expires_at.replace(tzinfo=None):
         raise HTTPException(status_code=400, detail="Code expired.")
         
    if payload.code != current_user.email_otp:
        raise HTTPException(status_code=401, detail="Invalid code.")
        
    current_user.mfa_enabled = True
    current_user.mfa_method = "email"
    current_user.email_otp = None
    db.commit()
    
    return {"message": "Email MFA enabled."}

# Placeholder for SMS (Commented Out logic)
# @router.post("/mfa/sms/request-code")
# def request_sms_code(...):
#     ...
#     # logic: generate code, send via Twilio/SNS, save to user.sms_otp
#     pass


@router.post("/mfa/setup")
def mfa_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Generate a new TOTP secret for the user."""
    secret = pyotp.random_base32()
    # Provisioning URI for QR code
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email, issuer_name="JuaLuma"
    )
    
    # Store secret temporarily (or overwrite existing). 
    # Not enabled until verified.
    current_user.mfa_secret = secret
    db.commit()
    
    return {"secret": secret, "otpauth_url": uri}


@router.post("/mfa/enable")
def mfa_enable(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Verify and enable MFA."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not started.",
        )

    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(payload.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code.",
        )

    current_user.mfa_enabled = True
    db.commit()
    
    return {"message": "MFA enabled successfully."}


@router.post("/mfa/disable")
def mfa_disable(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Disable MFA (requires valid code as confirmation)."""
    if not current_user.mfa_enabled:
        return {"message": "MFA is already disabled."}
        
    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(payload.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code.",
        )

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.commit()

    return {"message": "MFA disabled successfully."}


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
