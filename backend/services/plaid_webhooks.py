"""Plaid webhook verification and parsing helpers."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from typing import Any

import requests
from fastapi import HTTPException, status
from jose import JWTError, jwt

from backend.core.config import settings

logger = logging.getLogger(__name__)


def _plaid_api_base_url() -> str:
    env_name = settings.plaid_env.lower()
    if env_name in {"production", "prod"}:
        return "https://production.plaid.com"
    return "https://sandbox.plaid.com"


def parse_plaid_webhook_payload(payload: bytes) -> dict[str, Any]:
    try:
        decoded = json.loads(payload.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Plaid webhook payload.",
        ) from exc
    if not isinstance(decoded, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Plaid webhook payload.",
        )
    return decoded


def _verify_hmac_signature(payload: bytes, header_value: str | None, secret: str) -> bool:
    if not header_value:
        return False
    provided = header_value.strip()
    if provided.startswith("v1="):
        provided = provided.split("=", 1)[1].strip()

    expected = hmac.new(secret.encode("utf-8"), payload, digestmod=hashlib.sha256).hexdigest()
    return hmac.compare_digest(provided, expected)


def _fetch_plaid_webhook_key(key_id: str) -> dict[str, Any]:
    response = requests.post(
        f"{_plaid_api_base_url()}/webhook_verification_key/get",
        json={
            "client_id": settings.plaid_client_id,
            "secret": settings.plaid_secret,
            "key_id": key_id,
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to fetch Plaid webhook verification key.",
        )
    body = response.json()
    key = body.get("key")
    if not isinstance(key, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Plaid webhook verification key response.",
        )
    return key


def verify_plaid_webhook_signature(
    payload: bytes,
    *,
    plaid_verification: str | None,
    plaid_signature: str | None,
) -> bool:
    """
    Verify Plaid webhook authenticity.

    Order:
    1. If `PLAID_WEBHOOK_SECRET` is configured, validate HMAC signature.
    2. Otherwise, validate Plaid's JWT-based `Plaid-Verification` header.
    """
    if settings.plaid_webhook_secret:
        if not _verify_hmac_signature(payload, plaid_signature, settings.plaid_webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Plaid webhook signature.",
            )
        return True

    if not plaid_verification:
        if settings.app_env.lower() in {"local", "test"}:
            logger.warning("Skipping Plaid webhook signature verification in local/test.")
            return False
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Plaid webhook signature.",
        )

    try:
        header = jwt.get_unverified_header(plaid_verification)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Plaid webhook signature header.",
        ) from exc

    key_id = header.get("kid")
    if not key_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Plaid webhook key id.",
        )

    key = _fetch_plaid_webhook_key(str(key_id))
    algorithm = key.get("alg") or header.get("alg") or "ES256"
    try:
        claims = jwt.decode(
            plaid_verification,
            key,
            algorithms=[algorithm],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Plaid webhook JWT signature.",
        ) from exc

    request_hash = claims.get("request_body_sha256")
    expected_hash = hashlib.sha256(payload).hexdigest()
    if request_hash and request_hash != expected_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plaid webhook payload hash mismatch.",
        )

    issued_at = claims.get("iat")
    if isinstance(issued_at, int | float):
        if abs(int(time.time()) - int(issued_at)) > settings.plaid_webhook_tolerance_seconds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plaid webhook signature has expired.",
            )

    return True


def build_plaid_webhook_dedupe_key(payload_json: dict[str, Any], payload_raw: bytes) -> str:
    webhook_id = payload_json.get("webhook_id")
    if webhook_id:
        return hashlib.sha256(str(webhook_id).encode("utf-8")).hexdigest()
    return hashlib.sha256(payload_raw).hexdigest()


__all__ = [
    "build_plaid_webhook_dedupe_key",
    "parse_plaid_webhook_payload",
    "verify_plaid_webhook_signature",
]
