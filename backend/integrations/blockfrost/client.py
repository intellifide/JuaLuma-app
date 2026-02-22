# Updated 2026-01-21 00:05 CST
"""Shared Blockfrost REST client."""

from __future__ import annotations

import threading
import time

import requests

from backend.core.config import settings

_RATE_LIMIT_INTERVAL = 0.03
_LAST_REQUEST_AT = 0.0
_RATE_LIMIT_LOCK = threading.Lock()


def _resolve_base_url() -> str:
    base = (settings.blockfrost_url_mainnet or "").rstrip("/")
    if not base:
        raise RuntimeError("BLOCKFROST_URL_MAINNET not configured")
    return base


def _require_api_key() -> str:
    api_key = settings.blockfrost_api_key
    if not api_key:
        raise RuntimeError("BLOCKFROST_API_KEY not configured")
    return api_key


def _throttle() -> None:
    global _LAST_REQUEST_AT
    with _RATE_LIMIT_LOCK:
        now = time.monotonic()
        wait = _RATE_LIMIT_INTERVAL - (now - _LAST_REQUEST_AT)
        if wait > 0:
            time.sleep(wait)
            now = time.monotonic()
        _LAST_REQUEST_AT = now


def blockfrost_get(
    endpoint: str, params: dict | None = None, timeout: int = 15
) -> dict:
    api_key = _require_api_key()
    base_url = _resolve_base_url()
    path = endpoint.lstrip("/")
    url = f"{base_url}/{path}" if path else base_url
    headers = {"project_id": api_key}
    last_error: RuntimeError | None = None

    for attempt in range(3):
        _throttle()
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)
        except requests.RequestException as exc:
            raise RuntimeError(f"Blockfrost request failed: {exc}") from exc

        if resp.status_code == 429:
            last_error = RuntimeError("Blockfrost rate limit hit (HTTP 429).")
            time.sleep(0.5 * (attempt + 1))
            continue
        if resp.status_code < 200 or resp.status_code >= 300:
            raise RuntimeError(f"Blockfrost HTTP {resp.status_code}: {resp.text}")

        try:
            return resp.json()
        except ValueError as exc:
            raise RuntimeError("Blockfrost response was not valid JSON") from exc

    raise last_error or RuntimeError("Blockfrost request failed after retries")


__all__ = ["blockfrost_get"]
