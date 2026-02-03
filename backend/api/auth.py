# CORE PURPOSE: Authentication and identity endpoints for user access control.
# LAST MODIFIED: 2026-01-23 22:39 CST
import logging
import random
import re
import string
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
import uuid
from threading import Lock
from urllib.parse import parse_qs, urlparse

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from backend.core import settings
from backend.core.constants import UserStatus
from backend.core.legal import REQUIRED_SIGNUP_AGREEMENTS
from backend.middleware.auth import get_current_identity, get_current_user
from backend.models import (
    AISettings,
    AuditLog,
    HouseholdInvite,
    HouseholdMember,
    LegalAgreementAcceptance,
    PendingSignup,
    Subscription,
    User,
    UserSession,
)
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
    first_name: str = Field(min_length=1, max_length=128, example="John")
    last_name: str = Field(min_length=1, max_length=128, example="Doe")
    username: str | None = Field(default=None, max_length=64, example="johndoe")
    agreements: list[AgreementAcceptancePayload] = Field(default_factory=list)
    
    @model_validator(mode="before")
    @classmethod
    def normalize_username(cls, data: any) -> any:
        """Convert empty username strings to None."""
        if isinstance(data, dict) and "username" in data:
            if isinstance(data["username"], str) and (data["username"] == "" or data["username"].strip() == ""):
                data["username"] = None
            elif isinstance(data["username"], str):
                data["username"] = data["username"].strip()
        return data
    
    @model_validator(mode="after")
    def validate_username(self) -> "SignupRequest":
        """Validate username length if provided."""
        if self.username is not None:
            if len(self.username) < 3:
                raise ValueError("Username must be at least 3 characters long.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"email": "fin.user@example.com", "password": "MyS3curePass!"},
            ]
        }
    )


class PendingSignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=128, example="John")
    last_name: str = Field(min_length=1, max_length=128, example="Doe")
    username: str | None = Field(default=None, max_length=64, example="johndoe")
    agreements: list[AgreementAcceptancePayload] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_username(cls, data: any) -> any:
        """Convert empty username strings to None."""
        if isinstance(data, dict) and "username" in data:
            if isinstance(data["username"], str) and (data["username"] == "" or data["username"].strip() == ""):
                data["username"] = None
            elif isinstance(data["username"], str):
                data["username"] = data["username"].strip()
        return data

    @model_validator(mode="after")
    def validate_username(self) -> "PendingSignupRequest":
        """Validate username length if provided."""
        if self.username is not None:
            if len(self.username) < 3:
                raise ValueError("Username must be at least 3 characters long.")
        return self


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
    first_name: str | None = Field(default=None, max_length=128, example="John")
    last_name: str | None = Field(default=None, max_length=128, example="Doe")
    username: str | None = Field(default=None, max_length=64, example="johndoe")
    display_name_pref: str | None = Field(default=None, max_length=16, example="name")
    phone_number: str | None = Field(default=None, max_length=32, example="+12125551234")
    time_zone: str | None = Field(default=None, max_length=64, example="America/Chicago")
    # currency_pref: str | None = Field(
    #     default=None, min_length=3, max_length=3, example="USD"
    # )

    @model_validator(mode="before")
    @classmethod
    def normalize_empty_strings(cls, data: any) -> any:
        """Convert empty strings to None for optional fields."""
        logger.debug(f"ProfileUpdateRequest before validation - raw data: {data}")
        if isinstance(data, dict):
            for field in ["username", "first_name", "last_name", "phone_number", "time_zone"]:
                if field in data:
                    value = data[field]
                    # Convert empty string or whitespace-only string to None
                    if isinstance(value, str) and (value == "" or value.strip() == ""):
                        data[field] = None
                        logger.debug(f"Normalized {field}: empty string -> None")
                    elif isinstance(value, str):
                        # Trim whitespace from non-empty strings
                        original = data[field]
                        data[field] = value.strip()
                        if original != data[field]:
                            logger.debug(f"Normalized {field}: '{original}' -> '{data[field]}'")
            # Ensure at least one non-empty field is provided based on raw payload.
            def has_value(value: object) -> bool:
                if value is None:
                    return False
                if isinstance(value, str):
                    return value.strip() != ""
                return True

            has_any_field = any(
                has_value(data.get(field))
                for field in [
                    "theme_pref",
                    "first_name",
                    "last_name",
                    "username",
                    "display_name_pref",
                    "phone_number",
                ]
            )
            logger.debug(
                "ProfileUpdateRequest pre-validation - has_any_field=%s, data=%s",
                has_any_field,
                data,
            )
            if not has_any_field:
                if settings.is_local:
                    logger.warning(
                        "ProfileUpdateRequest validation failed: no fields provided (raw payload).",
                        extra={"payload": data},
                    )
                else:
                    logger.warning(
                        "ProfileUpdateRequest validation failed: no fields provided."
                    )
                raise ValueError("Provide at least one field to update.")
        logger.debug(f"ProfileUpdateRequest after normalization: {data}")
        return data

    @model_validator(mode="after")
    def validate_fields(self) -> "ProfileUpdateRequest":
        logger.debug(f"ProfileUpdateRequest after validation - first_name={self.first_name}, last_name={self.last_name}, username={self.username}, display_name_pref={self.display_name_pref}")
        
        # Validate username length if provided (after normalization)
        if self.username is not None and self.username != "":
            if len(self.username) < 3:
                logger.warning(f"Username validation failed: '{self.username}' is less than 3 characters")
                raise ValueError("Username must be at least 3 characters long.")
        if self.phone_number:
            normalized = re.sub(r"\s+", "", self.phone_number)
            if not re.match(r"^\+?[1-9]\d{7,14}$", normalized):
                raise ValueError("phone_number must be in E.164 format.")
            self.phone_number = normalized
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


def _serialize_pending_profile(pending: PendingSignup) -> dict:
    """Build a minimal profile payload for pending signups."""
    return {
        "uid": pending.uid,
        "email": pending.email,
        "status": pending.status,
        "plan": "free",
        "subscription_status": "inactive",
        "subscriptions": [],
        "ai_settings": None,
        "is_developer": False,
        "time_zone": "UTC",
        "household_member": None,
    }


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
            detail="The multi-factor authentication setup for your account is incomplete. Please complete the setup in settings.",
        )
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(mfa_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The multi-factor authentication code provided is incorrect.",
        )


def _verify_email_otp(user: User, mfa_code: str, db: Session) -> None:
    if not user.email_otp or not user.email_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code was found. Please request a new code.",
        )
    # Simple timezone-naive comparison if tzinfo is mixed, relying on utcnow assumption
    if datetime.now(user.email_otp_expires_at.tzinfo) > user.email_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a new one.",
        )
    if mfa_code != user.email_otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The verification code provided is incorrect.",
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


def _build_frontend_reset_link(reset_link: str) -> str:
    """Rewrite Firebase reset links to the frontend reset page when possible."""
    parsed = urlparse(reset_link)
    params = parse_qs(parsed.query)
    oob_code = params.get("oobCode", [None])[0]
    if not oob_code:
        return reset_link

    base = settings.frontend_url.rstrip("/")
    return f"{base}/reset-password?oobCode={oob_code}"


def _rollback_firebase_user(uid: str, *, email: str | None, reason: str) -> None:
    from firebase_admin import auth
    from firebase_admin import exceptions as firebase_exceptions

    try:
        auth.delete_user(uid)
        logger.warning(
            "Rolled back Firebase user after signup failure.",
            extra={"uid": uid, "email": email, "reason": reason},
        )
    except firebase_exceptions.FirebaseError as exc:
        logger.critical(
            "CRITICAL: Failed to rollback Firebase user after signup failure.",
            extra={"uid": uid, "email": email, "reason": reason},
            exc_info=exc,
        )


def _handle_existing_db_user(
    email: str,
    password: str,
    db: Session,
):
    """
    Handle logic when a user already exists in the DB.
    Returns (record, synced_user_obj) when a sync is performed.
    """
    from firebase_admin import auth
    from firebase_admin import exceptions as firebase_exceptions

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        return None, None

    try:
        existing_record = auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        # Firebase missing; heal by creating with the DB UID
        try:
            logger.info(
                "Healing missing Firebase user from DB record.",
                extra={"email": email, "uid": db_user.uid},
            )
            record = auth.create_user(uid=db_user.uid, email=email, password=password)
            return record, db_user
        except firebase_exceptions.AlreadyExistsError:
            # Race: retry lookup and fall through to UID sync
            try:
                existing_record = auth.get_user_by_email(email)
            except firebase_exceptions.FirebaseError as exc:
                logger.error(
                    "Firebase lookup failed after create_user race.",
                    extra={"email": email, "uid": db_user.uid},
                    exc_info=exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="We're experiencing an issue connecting to our authentication service. Please try again in a moment.",
                ) from exc
        except firebase_exceptions.FirebaseError as exc:
            logger.error(
                "Firebase create_user failed for existing DB user.",
                extra={"email": email, "uid": db_user.uid},
                exc_info=exc,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Firebase unavailable. Try again shortly.",
            ) from exc
    except firebase_exceptions.FirebaseError as exc:
        logger.error(
            "Firebase lookup failed for existing DB user.",
            extra={"email": email, "uid": db_user.uid},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Firebase unavailable. Try again shortly.",
        ) from exc

    if existing_record.uid != db_user.uid:
        logger.info(
            "Healing desynced user. Updating DB UID to match Firebase.",
            extra={
                "email": email,
                "old_uid": db_user.uid,
                "new_uid": existing_record.uid,
            },
        )
        try:
            db_user.uid = existing_record.uid
            db.commit()
            db.refresh(db_user)
            return existing_record, db_user
        except Exception as exc:
            logger.error(
                "Failed to heal DB user after UID mismatch.",
                extra={"email": email, "uid": existing_record.uid},
                exc_info=exc,
            )
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="We encountered an issue synchronizing your account data. Please contact support if the issue persists.",
            ) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="An account with this email address already exists.",
    )


def _handle_existing_firebase_user(email: str, db: Session):
    """
    Handle logic when a user already exists in Firebase.
    Returns (record, is_synced_user_obj).
    If is_synced_user_obj is returned, it means we healed a desync and should return early.
    """
    from firebase_admin import auth
    from firebase_admin import exceptions as firebase_exceptions

    try:
        existing_user = auth.get_user_by_email(email)
    except firebase_exceptions.FirebaseError as exc:
        logger.error(
            "Firebase lookup failed during signup.",
            extra={"email": email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Firebase unavailable. Try again shortly.",
        ) from exc

    # Check DB by authoritative UID
    db_user_by_uid = db.query(User).filter(User.uid == existing_user.uid).first()
    if db_user_by_uid:
        # Truly a duplicate
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
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
        except Exception as exc:
            logger.error(
                "Failed to heal user during signup.",
                extra={"email": email, "uid": existing_user.uid},
                exc_info=exc,
            )
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account sync failed.",
            ) from exc

    # Truly Zombie
    logger.info(f"Healing zombie user account for {email} ({existing_user.uid})")
    return existing_user, None


def _create_db_user_safe(
    db: Session, 
    record, 
    is_fresh_firebase_user: bool,
    first_name: str | None = None,
    last_name: str | None = None,
    username: str | None = None,
) -> User:
    try:
        user = create_user_record(
            db, 
            uid=record.uid, 
            email=record.email,
            first_name=first_name,
            last_name=last_name,
            username=username,
        )
        return user
    except Exception as exc:
        if isinstance(exc, ValueError):
            existing_user = db.query(User).filter(User.email == record.email).first()
            if existing_user:
                if existing_user.uid == record.uid:
                    logger.info(
                        "Signup raced with existing DB user; treating as idempotent.",
                        extra={"email": record.email, "uid": record.uid},
                    )
                    return existing_user
                logger.info(
                    "Healing DB user after signup conflict.",
                    extra={
                        "email": record.email,
                        "old_uid": existing_user.uid,
                        "new_uid": record.uid,
                    },
                )
                try:
                    existing_user.uid = record.uid
                    db.commit()
                    db.refresh(existing_user)
                    return existing_user
                except Exception as sync_exc:
                    logger.error(
                        "Failed to heal DB user after signup conflict.",
                        extra={"email": record.email, "uid": record.uid},
                        exc_info=sync_exc,
                    )
                    db.rollback()

        logger.error(
            "DB creation failed during signup.",
            extra={"email": record.email, "uid": record.uid},
            exc_info=exc,
        )
        # Rollback Firebase if we just created it
        if is_fresh_firebase_user:
            _rollback_firebase_user(
                record.uid,
                email=record.email,
                reason="db_creation_failed",
            )

        if isinstance(exc, ValueError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists.",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We encountered an issue creating your account. Please try again.",
        ) from exc


def _cleanup_partial_signup(db: Session, uid: str) -> None:
    """Best-effort cleanup for partially created signup data."""
    try:
        db.query(PendingSignup).filter(PendingSignup.uid == uid).delete()
        db.query(Subscription).filter(Subscription.uid == uid).delete()
        db.query(AISettings).filter(AISettings.uid == uid).delete()
        db.query(LegalAgreementAcceptance).filter(LegalAgreementAcceptance.uid == uid).delete()
        db.query(User).filter(User.uid == uid).delete()
        db.commit()
    except Exception as exc:
        logger.error(
            "Failed to cleanup partial signup data.",
            extra={"uid": uid},
            exc_info=exc,
        )
        db.rollback()


def _generate_and_send_otp(target: User | PendingSignup, db: Session) -> None:
    """Helper to generate OTP and send via email."""
    code = "".join(random.choices(string.digits, k=6))
    target.email_otp = code
    target.email_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    try:
        client = get_email_client()
        client.send_otp(target.email, code)
    except Exception as e:
        logger.error(f"Failed to send initial OTP to {target.email}: {e}")
        # Don't block signup success, user can resend later


def _store_pending_signup(
    db: Session,
    *,
    uid: str,
    email: str,
    payload: PendingSignupRequest | SignupRequest,
    status: str,
) -> PendingSignup:
    agreements_payload = [agreement.model_dump() for agreement in payload.agreements]

    pending_signup = db.query(PendingSignup).filter(PendingSignup.email == email).first()
    if pending_signup and pending_signup.uid != uid:
        db.delete(pending_signup)
        db.commit()
        pending_signup = None

    if not pending_signup:
        pending_signup = PendingSignup(uid=uid, email=email)
        db.add(pending_signup)

    pending_signup.first_name = payload.first_name
    pending_signup.last_name = payload.last_name
    pending_signup.username = payload.username
    pending_signup.status = status
    pending_signup.agreements_json = agreements_payload
    db.commit()
    db.refresh(pending_signup)

    return pending_signup


@router.post("/signup/pending", status_code=status.HTTP_201_CREATED)
def signup_pending(
    payload: PendingSignupRequest,
    identity: dict = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> dict:
    """
    Store temporary signup data after Firebase user creation.

    Requires a valid Firebase ID token.
    """
    uid = identity.get("uid")
    email = identity.get("email")
    if not uid or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data.",
        )

    existing_user = db.query(User).filter(User.uid == uid).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    existing_user_email = db.query(User).filter(User.email == email).first()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    required_keys = set(REQUIRED_SIGNUP_AGREEMENTS)
    accepted_keys = {agreement.agreement_key for agreement in payload.agreements}
    missing = required_keys - accepted_keys
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Missing required legal agreements: "
                f"{', '.join(sorted(missing))}."
            ),
        )

    if payload.username:
        existing_username = db.query(User).filter(User.username == payload.username).first()
        pending_username = (
            db.query(PendingSignup)
            .filter(PendingSignup.username == payload.username, PendingSignup.email != email)
            .first()
        )
        if existing_username or pending_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken. Please choose another.",
            )

    pending_signup = _store_pending_signup(
        db,
        uid=uid,
        email=email,
        payload=payload,
        status=UserStatus.PENDING_VERIFICATION,
    )

    _generate_and_send_otp(pending_signup, db)

    return {"uid": uid, "email": email, "message": "Signup started."}


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
    except Exception as exc:
        logger.error(
            "Firebase app initialization failed during signup.",
            extra={"email": payload.email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Firebase unavailable. Try again shortly.",
        ) from exc

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    try:
        record = auth.create_user(email=payload.email, password=payload.password)
        is_fresh_firebase_user = True
    except firebase_exceptions.AlreadyExistsError:
        record, _ = _handle_existing_firebase_user(payload.email, db)
    except firebase_exceptions.InvalidArgumentError as exc:
        logger.error(
            "Firebase rejected signup parameters.",
            extra={"email": payload.email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The information provided for signup is invalid. Please check your email and password.",
        ) from exc
    except firebase_exceptions.FirebaseError as exc:
        logger.error(
            "Firebase create_user failed during signup.",
            extra={"email": payload.email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Firebase unavailable. Try again shortly.",
        ) from exc

    # Validate username uniqueness if provided (already validated length in model)
    if payload.username:
        existing_username = db.query(User).filter(User.username == payload.username).first()
        pending_username = (
            db.query(PendingSignup)
            .filter(PendingSignup.username == payload.username, PendingSignup.email != payload.email)
            .first()
        )
        if existing_username or pending_username:
            if is_fresh_firebase_user and record:
                _rollback_firebase_user(
                    record.uid,
                    email=record.email,
                    reason="username_conflict",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken. Please choose another.",
            )

    required_keys = set(REQUIRED_SIGNUP_AGREEMENTS)
    accepted_keys = {agreement.agreement_key for agreement in payload.agreements}
    missing = required_keys - accepted_keys
    if missing:
        logger.warning(
            "Signup missing required legal agreements.",
            extra={"email": payload.email, "missing": sorted(missing)},
        )
        if is_fresh_firebase_user and record:
            _rollback_firebase_user(
                record.uid,
                email=record.email,
                reason="missing_required_agreements",
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Missing required legal agreements: "
                    f"{', '.join(sorted(missing))}."
                ),
            )

    pending_signup = _store_pending_signup(
        db,
        uid=record.uid,
        email=record.email,
        payload=payload,
        status=UserStatus.PENDING_VERIFICATION,
    )

    # Automatically send verification OTP
    _generate_and_send_otp(pending_signup, db)

    return {"uid": record.uid, "email": record.email, "message": "Signup started."}


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
            detail="Invalid session data.",
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
            detail="Your account could not be found.",
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

    if user.mfa_enabled and not payload.mfa_code:
        return {"message": "MFA_REQUIRED"}

    if user.mfa_enabled:
        _verify_mfa(user, payload.mfa_code, db)

    try:
        reset_link = generate_password_reset_link(payload.email)
        reset_link = _build_frontend_reset_link(reset_link)
    except ValueError:
        # Should not happen as we checked above, but safe fallback
        return {"message": "Reset link sent"}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We could not send a reset link at this time. Please try again later.",
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
        if not payload.mfa_code:
            return {"message": "MFA_REQUIRED"}
        _verify_mfa(current_user, payload.mfa_code, db)

    # 2. Verify Current Password
    if not verify_password(current_user.email, payload.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The current password provided is incorrect.",
        )

    # 3. Update Password
    try:
        update_user_password(current_user.uid, payload.new_password)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We encountered an issue updating your password. Please try again.",
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
    identity: dict = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> dict:
    """Return the authenticated user's profile with preferences and subscriptions."""
    uid = identity.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session data."
        )

    user = (
        db.query(User)
        .options(
            selectinload(User.subscriptions),
            selectinload(User.ai_settings),
            selectinload(User.notification_preferences),
            selectinload(User.developer),
        )
        .filter(User.uid == uid)
        .first()
    )

    if not user:
        pending_signup = (
            db.query(PendingSignup).filter(PendingSignup.uid == uid).first()
        )
        if not pending_signup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Your account session is invalid.",
            )
        return {"user": _serialize_pending_profile(pending_signup)}

    return {"user": _serialize_profile(user)}


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update user profile information including name and username."""
    logger.info(f"Profile update request for user {current_user.uid}: first_name={payload.first_name}, last_name={payload.last_name}, username={payload.username}, display_name_pref={payload.display_name_pref}")
    
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
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.username is not None:
        # Validate username length
        if len(payload.username) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 3 characters long.",
            )
        # Check if username is already taken by another user
        existing_user = db.query(User).filter(
            User.username == payload.username,
            User.uid != current_user.uid
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken. Please choose another.",
            )
        user.username = payload.username
    elif payload.username is None and user.username:
        # Allow clearing username by sending null/empty
        user.username = None
    if payload.display_name_pref is not None:
        if payload.display_name_pref not in ["name", "username"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="display_name_pref must be either 'name' or 'username'.",
            )
        user.display_name_pref = payload.display_name_pref
    if payload.phone_number is not None:
        user.phone_number = payload.phone_number
    elif payload.phone_number is None and user.phone_number:
        user.phone_number = None
    if payload.time_zone is not None:
        try:
            from zoneinfo import ZoneInfo

            ZoneInfo(payload.time_zone)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time_zone. Use an IANA timezone like 'America/Chicago'.",
            ) from exc
        user.time_zone = payload.time_zone
    # if payload.currency_pref is not None:
    #     user.currency_pref = payload.currency_pref.upper()

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        # Check if it's a username uniqueness violation
        if "username" in str(exc).lower() or "uq_users_username" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken. Please choose another.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile. Please try again.",
        ) from exc

    return {"user": _serialize_profile(user)}


@router.post("/mfa/email/request-code")
def request_email_code(
    payload: ResetPasswordRequest,  # reusing email field
    db: Session = Depends(get_db),
) -> dict:
    """Request an Email OTP for login or setup."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        _generate_and_send_otp(user, db)
        return {"message": "Code sent."}

    pending_signup = (
        db.query(PendingSignup).filter(PendingSignup.email == payload.email).first()
    )
    if pending_signup:
        _generate_and_send_otp(pending_signup, db)
        return {"message": "Code sent."}

    # Prevent enumeration
    return {"message": "If account exists, code sent."}


@router.post("/mfa/email/enable")
def enable_email_mfa(
    payload: MFAVerifyRequest,
    identity: dict = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> dict:
    """Enable Email MFA by verifying a sent code."""
    uid = identity.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid session data.")

    current_user = db.query(User).filter(User.uid == uid).first()

    if current_user:
        if not current_user.email_otp or not current_user.email_otp_expires_at:
            raise HTTPException(status_code=400, detail="Please request a verification code before enabling MFA.")

        # Timezone naive vs aware fix using utcnow/native
        if datetime.utcnow() > current_user.email_otp_expires_at.replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="The verification code has expired. Please request a new one.")

        if payload.code != current_user.email_otp:
            raise HTTPException(status_code=401, detail="The verification code provided is incorrect.")

        current_user.email_otp = None
        current_user.email_otp_expires_at = None

        if current_user.status == UserStatus.PENDING_VERIFICATION:
            # Email verification during onboarding should not auto-enable MFA.
            current_user.mfa_enabled = False
            if current_user.mfa_method == "email":
                current_user.mfa_method = None
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
                return {"message": "Email verified."}

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
            return {"message": "Email verified."}

        current_user.mfa_enabled = True
        current_user.mfa_method = "email"
        db.commit()

        return {"message": "Email MFA enabled."}

    pending_signup = db.query(PendingSignup).filter(PendingSignup.uid == uid).first()
    if not pending_signup:
        raise HTTPException(status_code=404, detail="Signup session not found.")

    if not pending_signup.email_otp or not pending_signup.email_otp_expires_at:
        raise HTTPException(status_code=400, detail="Please request a verification code before enabling MFA.")

    if datetime.utcnow() > pending_signup.email_otp_expires_at.replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="The verification code has expired. Please request a new one.")

    if payload.code != pending_signup.email_otp:
        raise HTTPException(status_code=401, detail="The verification code provided is incorrect.")

    pending_signup.email_otp = None
    pending_signup.email_otp_expires_at = None
    pending_signup.status = UserStatus.PENDING_PLAN_SELECTION
    db.commit()

    return {"message": "Email verified."}


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
            detail="The multi-factor authentication setup has not been initiated.",
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
            detail="The multi-factor authentication code provided is incorrect.",
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
    # Deactivate current session record in our DB
    iat = getattr(request.state, "iat", None)
    if iat:
        session_rec = db.query(UserSession).filter(
            UserSession.uid == current_user.uid,
            UserSession.iat == iat
        ).first()
        if session_rec:
            session_rec.is_active = False

    try:
        revoke_refresh_tokens(current_user.uid)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We encountered an issue during logout. Please close your browser and try again.",
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


@router.get("/sessions")
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    """List all sessions for the current user."""
    sessions = db.query(UserSession).filter(
        UserSession.uid == current_user.uid
    ).order_by(UserSession.last_active.desc()).all()
    
    current_iat = getattr(request.state, "iat", None)
    
    result = []
    for s in sessions:
        d = s.to_dict()
        d["is_current"] = (s.iat == current_iat)
        result.append(d)
        
    return result


@router.delete("/sessions/{session_id}")
def end_session(
    session_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Terminate a specific session."""
    session_rec = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.uid == current_user.uid
    ).first()
    
    if not session_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )
        
    current_iat = getattr(request.state, "iat", None)
    if session_rec.iat == current_iat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot terminate your current session. Use logout instead."
        )
        
    session_rec.is_active = False
    db.commit()
    
    # Optionally: If we want to force logout on Firebase side, we might need more effort,
    # but since our middleware checks is_active, this is sufficient for blocking access.
    
    return {"message": "Session terminated successfully."}


@router.delete("/sessions")
def end_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Terminate all sessions except the current one."""
    current_iat = getattr(request.state, "iat", None)
    
    if not current_iat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot identify your current session."
        )
        
    # Mark all other active sessions as inactive
    db.query(UserSession).filter(
        UserSession.uid == current_user.uid,
        UserSession.iat != current_iat,
        UserSession.is_active == True
    ).update({UserSession.is_active: False}, synchronize_session=False)
    
    db.commit()
    
    return {"message": "All other sessions have been terminated."}


__all__ = ["router"]
