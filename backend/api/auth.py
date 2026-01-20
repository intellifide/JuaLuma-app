# CORE PURPOSE: Authentication and identity endpoints for user access control.
# LAST MODIFIED: 2026-01-18 01:02 CST
import logging
import random
import string
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from backend.core.constants import UserStatus
from backend.core.legal import REQUIRED_SIGNUP_AGREEMENTS
from backend.middleware.auth import get_current_user
from backend.models import AuditLog, HouseholdInvite, HouseholdMember, Subscription, User
from backend.schemas.legal import AgreementAcceptancePayload
from backend.services.legal import record_agreement_acceptances
from backend.services.auth import (
    _get_firebase_app,
    create_user_record,
    generate_password_reset_link,
    revoke_refresh_tokens,
    update_user_password,
    verify_password,
    verify_token,
)
from backend.services import household_service
from backend.services.email import get_email_client
from backend.utils import get_db

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    email: EmailStr = Field(example="user@example.com")
    password: str = Field(min_length=8, max_length=128, example="Str0ngPass!")
    agreements: list[AgreementAcceptancePayload] = Field(default_factory=list)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"email": "fin.user@example.com", "password": "MyS3curePass!"},
            ]
        }
    )


class TokenRequest(BaseModel):
    token: str = Field(min_length=10, example="eyJhbGciOiJSUzI1NiIsImtpZCI6...")
    mfa_code: str | None = Field(
        default=None, min_length=6, max_length=6, example="123456"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...sample", "mfa_code": "123456"}
            ]
        }
    )


class MFAVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, example="123456")


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(example="user@example.com")
    mfa_code: str | None = Field(
        default=None, min_length=6, max_length=6, example="123456"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"email": "forgot@example.com", "mfa_code": "123456"}]
        }
    )


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    mfa_code: str | None = Field(default=None, min_length=6, max_length=6)


class ProfileUpdateRequest(BaseModel):
    theme_pref: str | None = Field(default=None, max_length=32, example="dark")
    currency_pref: str | None = Field(
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
    all_subs = sorted(
        user.subscriptions or [], key=lambda x: x.created_at, reverse=True
    )
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
        for sub in all_subs
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

    # Expose the most recent subscription as the primary plan
    if all_subs:
        profile["plan"] = all_subs[0].plan
        profile["subscription_status"] = all_subs[0].status
    else:
        profile["plan"] = "free"
        profile["subscription_status"] = "active"

    profile["ai_settings"] = ai_settings
    profile["is_developer"] = True if user.developer else False

    # Household Info
    if user.household_member:
        profile["household_member"] = {
            "household_id": str(user.household_member.household_id),
            "role": user.household_member.role,
            "can_view_household": user.household_member.can_view_household,
            "ai_access_enabled": user.household_member.ai_access_enabled,
        }
    else:
        profile["household_member"] = None

    return profile


# Simple in-memory rate limiter keyed by client IP
_login_attempts: dict[str, deque[float]] = defaultdict(deque)
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


def _verify_totp(user: User, mfa_code: str) -> None:
    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup incomplete.",
        )
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(mfa_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )


def _verify_email_otp(user: User, mfa_code: str, db: Session) -> None:
    if not user.email_otp or not user.email_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP generated. Request a code first.",
        )
    # Simple timezone-naive comparison if tzinfo is mixed, relying on utcnow assumption
    if datetime.now(user.email_otp_expires_at.tzinfo) > user.email_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired.",
        )
    if mfa_code != user.email_otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )
    # Consume OTP
    user.email_otp = None
    db.commit()


def _verify_mfa(user: User, mfa_code: str | None, db: Session) -> None:
    """Helper to verify MFA code for a user."""
    if not user.mfa_enabled:
        return

    if not mfa_code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA_REQUIRED",
        )

    method = user.mfa_method or "totp"

    if method == "totp":
        _verify_totp(user, mfa_code)
    elif method == "email":
        _verify_email_otp(user, mfa_code, db)
    elif method == "sms":
        raise HTTPException(status_code=501, detail="SMS MFA not implemented")


def _handle_existing_firebase_user(email: str, db: Session):
    """
    Handle logic when a user already exists in Firebase.
    Returns (record, is_synced_user_obj).
    If is_synced_user_obj is returned, it means we healed a desync and should return early.
    """
    from firebase_admin import auth

    existing_user = auth.get_user_by_email(email)

    # Check DB by authoritative UID
    db_user_by_uid = db.query(User).filter(User.uid == existing_user.uid).first()
    if db_user_by_uid:
        # Truly a duplicate
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists.",
        )

    # Check DB by Email (Potential Desync)
    db_user_by_email = db.query(User).filter(User.email == email).first()
    if db_user_by_email:
        # Heal it
        logger.info(
            f"Healing desynced user {email}. DB UID {db_user_by_email.uid} -> Auth UID {existing_user.uid}"
        )
        try:
            db_user_by_email.uid = existing_user.uid
            db.commit()
            db.refresh(db_user_by_email)
            return existing_user, db_user_by_email
        except Exception as e:
            logger.error(f"Failed to heal user {email}: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account sync failed.",
            ) from e

    # Truly Zombie
    logger.info(f"Healing zombie user account for {email} ({existing_user.uid})")
    return existing_user, None


def _create_db_user_safe(db: Session, record, is_fresh_firebase_user: bool) -> User:
    from firebase_admin import auth

    try:
        user = create_user_record(db, uid=record.uid, email=record.email)
        return user
    except Exception as exc:
        logger.error(
            f"DB creation failed for {record.email} (UID: {record.uid}): {exc}"
        )
        # Rollback Firebase if we just created it
        if is_fresh_firebase_user:
            try:
                logger.warning(
                    f"Rolling back Firebase user {record.uid} due to DB failure."
                )
                auth.delete_user(record.uid)
            except Exception as cleanup_exc:
                logger.critical(
                    f"CRITICAL: Failed to rollback Firebase user {record.uid} after DB failure: {cleanup_exc}"
                )

        if isinstance(exc, ValueError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists.",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account creation failed. Please try again.",
        ) from exc


def _generate_and_send_otp(user: User, db: Session) -> None:
    """Helper to generate OTP and send via email."""
    code = "".join(random.choices(string.digits, k=6))
    user.email_otp = code
    user.email_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    try:
        client = get_email_client()
        client.send_otp(user.email, code)
    except Exception as e:
        logger.error(f"Failed to send initial OTP to {user.email}: {e}")
        # Don't block signup success, user can resend later


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """
    Register a new user in Firebase and the local database.

    - **email**: Valid email address.
    - **password**: Password (min 8 chars).

    Returns the new user's UID and email.
    """
    from firebase_admin import auth
    from firebase_admin import exceptions as firebase_exceptions

    is_fresh_firebase_user = False
    record = None

    try:
        _get_firebase_app()
        record = auth.create_user(email=payload.email, password=payload.password)
        is_fresh_firebase_user = True
    except firebase_exceptions.AlreadyExistsError:
        record, synced_user = _handle_existing_firebase_user(payload.email, db)
        if synced_user:
            return {
                "uid": synced_user.uid,
                "email": synced_user.email,
                "message": "Account synced successfully.",
            }
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

    required_keys = set(REQUIRED_SIGNUP_AGREEMENTS)
    accepted_keys = {agreement.agreement_key for agreement in payload.agreements}
    missing = required_keys - accepted_keys
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required legal agreements: {', '.join(sorted(missing))}.",
        )

    # Create DB record
    user = _create_db_user_safe(db, record, is_fresh_firebase_user)

    try:
        record_agreement_acceptances(
            db,
            uid=user.uid,
            acceptances=payload.agreements,
            request=request,
            source="frontend",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    # Automatically send verification OTP
    _generate_and_send_otp(user, db)

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
        .options(selectinload(User.developer))
        .filter(User.uid == uid)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.mfa_enabled:
        _verify_mfa(user, payload.mfa_code, db)

    subscription = db.query(Subscription).filter(Subscription.uid == uid).first()
    if subscription and subscription.plan not in ["free", "trial"] and not subscription.welcome_email_sent:
        # Delayed Welcome Email Trigger
        try:
            email_client = get_email_client()
            email_client.send_subscription_welcome(user.email, subscription.plan)
            subscription.welcome_email_sent = True
            db.commit()
            logger.info(f"Sent delayed welcome email to {user.email} for plan {subscription.plan}")
        except Exception as e:
            logger.error(f"Failed to send delayed welcome email to {user.email}: {e}")

    profile = user.to_dict()
    if subscription:
        profile["plan"] = subscription.plan
        profile["subscription_status"] = subscription.status

    profile["status"] = user.status
    profile["is_developer"] = True if user.developer else False

    return {"user": profile}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> dict:
    """Generate and dispatch a password reset link. Enforces MFA if enabled."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Prevent enumeration
        return {"message": "Reset link sent"}

    if user.mfa_enabled:
        _verify_mfa(user, payload.mfa_code, db)

    try:
        reset_link = generate_password_reset_link(payload.email)
    except ValueError:
        # Should not happen as we checked above, but safe fallback
        return {"message": "Reset link sent"}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send reset link right now.",
        ) from exc

    # Securely dispatch the link via email
    try:
        email_client = get_email_client()
        email_client.send_password_reset(payload.email, reset_link)
    except Exception as e:
        logger.error(f"Failed to dispatch password reset email: {e}")
        # We generally do not want to expose email infrastructure failures to the user,
        # but we also don't want them waiting for an email that won't come.
        # Returning success (to prevent enumeration) is standard, but internal alerts are needed.

    return {
        "message": "Reset link sent",
    }


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update password for the logged-in user. Requires current password and MFA if enabled."""
    # 1. Verify MFA
    if current_user.mfa_enabled:
        _verify_mfa(current_user, payload.mfa_code, db)

    # 2. Verify Current Password
    if not verify_password(current_user.email, payload.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password.",
        )

    # 3. Update Password
    try:
        update_user_password(current_user.uid, payload.new_password)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    # Optional: Log the event
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="password_change",
        source="backend",
        metadata_json={"ip": "..."},  # should get from request
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Password updated successfully"}


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
    payload: ResetPasswordRequest,  # reusing email field
    db: Session = Depends(get_db),
) -> dict:
    """Request an Email OTP for login or setup."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Prevent enumeration
        return {"message": "If account exists, code sent."}

    _generate_and_send_otp(user, db)

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

    if current_user.status == UserStatus.PENDING_VERIFICATION:
        # 1. Check if ALREADY in a household (e.g. invite accepted during signup)
        existing_membership = db.query(HouseholdMember).filter(HouseholdMember.uid == current_user.uid).first()
        if existing_membership:
            current_user.status = UserStatus.ACTIVE
            # Send the household welcome email after OTP verification if the invite was accepted earlier.
            if existing_membership.role != "admin":
                household_service.send_household_welcome_email(
                    db,
                    to_email=current_user.email,
                    household_id=existing_membership.household_id,
                )
            logger.info(f"User {current_user.uid} verified email. Already a household member. Status -> ACTIVE")
            db.commit()
            return {"message": "Email MFA enabled."}

        # 2. Check for pending household invites (Case-insensitive check)
        # Note: invite.expires_at is timezone-aware.
        pending_invite = (
            db.query(HouseholdInvite)
            .filter(
                func.lower(HouseholdInvite.email) == func.lower(current_user.email),
                HouseholdInvite.status == "pending",
                HouseholdInvite.expires_at > datetime.now(UTC),
            )
            .first()
        )
        if pending_invite:
            # If invited, skip plan selection (they will be prompted to accept invite)
            current_user.status = UserStatus.ACTIVE
            logger.info(f"User {current_user.uid} ({current_user.email}) verified email. Pending invite found from {pending_invite.household_id}, setting status ACTIVE.")
        else:
            logger.info(f"User {current_user.uid} ({current_user.email}) verified email. No pending invite found. Status -> PENDING_PLAN_SELECTION")
            current_user.status = UserStatus.PENDING_PLAN_SELECTION

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
