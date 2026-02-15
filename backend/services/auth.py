# Updated 2026-02-14 by Antigravity
import logging
import time
from typing import Any

import google.auth
import requests
from google.auth.transport.requests import Request as GoogleRequest
from jose import jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.core import settings
from backend.core.constants import UserStatus
from backend.models import AISettings, Subscription, User
from backend.services.billing import create_stripe_customer

logger = logging.getLogger(__name__)

# Cache for public keys
_PUBLIC_KEYS = {}
_PUBLIC_KEYS_EXPIRY = 0

def _get_public_keys():
    global _PUBLIC_KEYS, _PUBLIC_KEYS_EXPIRY
    if _PUBLIC_KEYS and time.time() < _PUBLIC_KEYS_EXPIRY:
        return _PUBLIC_KEYS

    url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            _PUBLIC_KEYS = resp.json()
            # Parse cache-control to set expiry, or default to 1 hour
            cc = resp.headers.get("cache-control", "")
            max_age = 3600
            if "max-age=" in cc:
                try:
                    parts = cc.split("max-age=")
                    if len(parts) > 1:
                        max_age = int(parts[1].split(",")[0])
                except Exception:
                    pass
            _PUBLIC_KEYS_EXPIRY = time.time() + max_age
            return _PUBLIC_KEYS
    except Exception as e:
        logger.error(f"Failed to fetch public keys: {e}")
    return _PUBLIC_KEYS or {} # Return stale if fetch fails, or empty

def verify_token(token: str) -> dict[str, Any]:
    """Verify an ID token via direct JWT verification using GCP public keys."""
    if settings.is_local and token.startswith("E2E_MAGIC_TOKEN_"):
        uid = token.replace("E2E_MAGIC_TOKEN_", "")
        return {"uid": uid, "email": f"{uid}@example.com", "sub": uid}

    project_id = settings.resolved_gcp_project_id
    if not project_id:
        logger.error("GCP Project ID not configured for token verification.")
        raise ValueError("Server configuration error.")

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise ValueError("Token missing kid")

        keys = _get_public_keys()
        if kid not in keys:
             # Refresh keys once
             _PUBLIC_KEYS_EXPIRY = 0
             keys = _get_public_keys()
             if kid not in keys:
                 raise ValueError("Invalid kid")

        # Verify
        # jose.jwt.decode verifies signature, audience, issuer, expiry
        decoded = jwt.decode(
            token,
            keys[kid], # The cert string
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            options={"verify_at_hash": False} # at_hash not always present/needed
        )
        return decoded
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise RuntimeError("Token verification failed.") from e


def create_user_record(
    db: Session,
    *,
    uid: str,
    email: str,
    first_name: str | None = None,
    last_name: str | None = None,
    username: str | None = None,
) -> User:
    """
    Create the user and dependent records in a single transaction.
    """
    user = User(
        uid=uid,
        email=email,
        role="user",
        status=UserStatus.PENDING_VERIFICATION,
        theme_pref="glass",
        currency_pref="USD",
        first_name=first_name,
        last_name=last_name,
        username=username,
        display_name_pref="name",  # Default to name (first + last)
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

    # Sync with Stripe (Best effort)
    try:
        create_stripe_customer(db, uid, email)
    except Exception as exc:
        # Log but don't fail user creation
        logger.error(f"Failed to sync new user {uid} to Stripe: {exc}")

    return user


def _get_admin_token() -> str:
    """Get an OAuth 2.0 access token for Admin API calls."""
    try:
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        auth_req = GoogleRequest()
        creds.refresh(auth_req)
        return creds.token
    except Exception as e:
        logger.error(f"Failed to get admin credentials: {e}")
        raise RuntimeError("Server configuration error: cannot authenticate to GCP.") from e


def refresh_custom_claims(uid: str, claims: dict[str, Any]) -> None:
    """Update custom claims via Identity Toolkit Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:update"

        # customAttributes must be JSON stringified
        import json
        payload = {
            "localId": uid,
            "customAttributes": json.dumps(claims)
        }

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
            raise RuntimeError(f"GCP API Error: {resp.text}")

    except Exception as exc:
         logger.error(f"Failed to refresh custom claims: {exc}")
         raise RuntimeError("Failed to refresh custom claims.") from exc


def send_password_reset_email(email: str) -> None:
    """
    Send password reset email via Identity Platform REST API.
    Note: This sends the email directly via Google, bypassing custom SMTP.
    """
    try:
        api_key = settings.gcp_api_key
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
        payload = {"requestType": "PASSWORD_RESET", "email": email}
        resp = requests.post(url, json=payload, timeout=10)

        if not resp.ok:
            # Handle EMAIL_NOT_FOUND gracefully if desired, or let caller handle
            if "EMAIL_NOT_FOUND" in resp.text:
                return # Silent success
            raise RuntimeError(f"GCP API Error: {resp.text}")
    except Exception as exc:
        logger.error(f"Failed to send password reset email: {exc}")
        raise RuntimeError("Failed to send reset email.") from exc


def _get_auth_url(action: str) -> str:
    """Return the Identity Toolkit REST API URL."""
    api_key = settings.gcp_api_key or "fake-key"
    base = "https://identitytoolkit.googleapis.com/v1"
    return f"{base}/accounts:{action}?key={api_key}"


def verify_password(email: str, password: str) -> bool:
    """
    Verify email/password credentials via GCP REST API.
    Returns True if valid, False otherwise.
    """
    url = _get_auth_url("signInWithPassword")
    payload = {"email": email, "password": password, "returnSecureToken": True}

    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.status_code == 200
    except Exception as exc:
        logger.error(f"Password verification request failed: {exc}")
        return False


def update_user_password(uid: str, new_password: str) -> None:
    """Update a user's password via Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:update"

        payload = {
            "localId": uid,
            "password": new_password
        }

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
            raise RuntimeError(f"GCP API Error: {resp.text}")

    except Exception as exc:
        logger.error(f"Failed to update password for UID {uid}: {exc}")
        raise RuntimeError("Failed to update password in auth provider.") from exc


def revoke_refresh_tokens(uid: str) -> None:
    """Revoke all refresh tokens for a given user by updating validSince."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:update"

        # validSince: The timestamp in seconds. Prohibits tokens issued before this time.
        import datetime
        valid_since = int(datetime.datetime.now().timestamp())

        payload = {
            "localId": uid,
            "validSince": str(valid_since)
        }

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
             raise RuntimeError(f"GCP API Error: {resp.text}")

    except Exception as exc:
        raise RuntimeError("Failed to revoke refresh tokens.") from exc


def delete_user(uid: str) -> None:
    """Delete a user from Identity Platform via Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:delete"

        payload = {
            "localId": uid
        }

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
             # Ignore if user not found?
             if "USER_NOT_FOUND" not in resp.text:
                 raise RuntimeError(f"GCP API Error: {resp.text}")

    except Exception as exc:
        raise RuntimeError("Failed to delete user.") from exc


def get_user_by_email(email: str) -> dict | None:
    """Lookup user by email via Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:lookup"
        resp = requests.post(url, json={"email": [email]}, headers={"Authorization": f"Bearer {token}"})
        if resp.ok:
            data = resp.json()
            if "users" in data and len(data["users"]) > 0:
                return data["users"][0]
        return None
    except Exception as e:
        logger.error(f"Error looking up user {email}: {e}")
        return None


def get_user(uid: str) -> dict | None:
    """Lookup user by UID via Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:lookup"
        resp = requests.post(url, json={"localId": [uid]}, headers={"Authorization": f"Bearer {token}"})
        if resp.ok:
            data = resp.json()
            if "users" in data and len(data["users"]) > 0:
                return data["users"][0]
        return None
    except Exception:
        return None


def update_identity_user(uid: str, **kwargs) -> None:
    """Update user properties."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:update"

        payload = {"localId": uid}
        if "email" in kwargs:
            payload["email"] = kwargs["email"]
        if "password" in kwargs:
            payload["password"] = kwargs["password"]
        if "emailVerified" in kwargs:
            payload["emailVerified"] = kwargs["emailVerified"]

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
            raise RuntimeError(f"Failed to update user: {resp.text}")
    except Exception as e:
        raise RuntimeError(f"Failed to update user {uid}: {e}") from e


def create_identity_user(email: str, password: str, uid: str | None = None, email_verified: bool = False) -> dict:
    """Create a new user via Admin API."""
    try:
        token = _get_admin_token()
        project_id = settings.resolved_gcp_project_id
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts"
        payload = {
            "email": email,
            "password": password,
            "emailVerified": email_verified
        }
        if uid:
            payload["localId"] = uid

        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
        if not resp.ok:
             raise RuntimeError(f"Failed to create user: {resp.text}")
        return resp.json()
    except Exception as e:
        raise RuntimeError(f"Error creating user {email}: {e}") from e


__all__ = [
    "verify_token",
    "create_user_record",
    "refresh_custom_claims",
    "send_password_reset_email",
    "revoke_refresh_tokens",
    "verify_password",
    "update_user_password",
    "delete_user",
    "get_user_by_email",
    "create_identity_user",
    "get_user",
    "update_identity_user",
]
