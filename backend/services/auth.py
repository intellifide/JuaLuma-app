# Updated 2025-12-11 01:38 CST by ChatGPT
import os
from typing import Any, Dict

import firebase_admin
from firebase_admin import auth
from firebase_admin.auth import (
    ExpiredIdTokenError,
    InvalidIdTokenError,
    RevokedIdTokenError,
    UserNotFoundError,
)
from firebase_admin.exceptions import FirebaseError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.core import settings
from backend.models import AISettings, Subscription, User

_firebase_app: firebase_admin.App | None = None


def _get_firebase_app() -> firebase_admin.App:
    """Initialize (or reuse) the Firebase app, honoring the emulator when present."""
    global _firebase_app

    if _firebase_app:
        return _firebase_app

    if settings.is_local:
        if settings.resolved_auth_emulator_host:
            os.environ.setdefault(
                "FIREBASE_AUTH_EMULATOR_HOST", settings.resolved_auth_emulator_host
            )
        if settings.resolved_firestore_host:
            os.environ.setdefault(
                "FIRESTORE_EMULATOR_HOST", settings.resolved_firestore_host
            )
        os.environ.setdefault("FIREBASE_PROJECT_ID", settings.firebase_project_id)

    import logging

    logger = logging.getLogger(__name__)

    if os.getenv("FIREBASE_AUTH_EMULATOR_HOST"):
        logger.info(
            "Initializing Firebase Auth with Emulator",
            extra={
                "auth_host": settings.resolved_auth_emulator_host,
                "project": settings.firebase_project_id,
            },
        )
        _firebase_app = firebase_admin.initialize_app(
            options={"projectId": settings.firebase_project_id}
        )
    else:
        logger.info("Initializing Firebase Auth with Production/ADC Credentials")
        _firebase_app = firebase_admin.initialize_app()

    return _firebase_app


def verify_token(token: str) -> Dict[str, Any]:
    """Verify an ID token via Firebase Admin SDK."""
    try:
        return auth.verify_id_token(token, app=_get_firebase_app())
    except (ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError) as exc:
        raise ValueError("Token is invalid or expired.") from exc
    except FirebaseError as exc:
        raise RuntimeError("Token verification failed.") from exc


def create_user_record(db: Session, *, uid: str, email: str) -> User:
    """
    Create the user and dependent records in a single transaction.

    Defaults:
    - role=user
    - theme_pref=glass
    - currency_pref=USD
    - subscription plan=free, status=active
    - AI settings provider/model defaults from model definitions
    """
    user = User(
        uid=uid,
        email=email,
        role="user",
        theme_pref="glass",
        currency_pref="USD",
    )
    subscription = Subscription(uid=uid, plan="free", status="active", ai_quota_used=0)
    ai_settings = AISettings(uid=uid)

    try:
        db.add_all([user, subscription, ai_settings])
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("User already exists.") from exc
    except Exception as exc:
        db.rollback()
        raise exc

    return user


def refresh_custom_claims(uid: str, claims: Dict[str, Any]) -> None:
    """Update Firebase custom claims for a given user."""
    try:
        auth.set_custom_user_claims(uid, claims, app=_get_firebase_app())
    except FirebaseError as exc:
        raise RuntimeError("Failed to refresh custom claims.") from exc


def generate_password_reset_link(email: str) -> str:
    """Return a password reset link for the given email."""
    try:
        return auth.generate_password_reset_link(email, app=_get_firebase_app())
    except UserNotFoundError as exc:
        raise ValueError("User not found.") from exc
    except FirebaseError as exc:
        raise RuntimeError("Failed to generate reset link.") from exc


def revoke_refresh_tokens(uid: str) -> None:
    """Revoke all refresh tokens for a given user."""
    try:
        auth.revoke_refresh_tokens(uid, app=_get_firebase_app())
    except FirebaseError as exc:
        raise RuntimeError("Failed to revoke refresh tokens.") from exc


__all__ = [
    "verify_token",
    "create_user_record",
    "refresh_custom_claims",
    "generate_password_reset_link",
    "revoke_refresh_tokens",
]
