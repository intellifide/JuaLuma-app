"""Shared Bitquery v2 GraphQL client."""

from __future__ import annotations

import requests

from backend.core.config import BITQUERY_API_KEY, BITQUERY_URL


def _resolve_endpoint() -> str:
    base = (BITQUERY_URL or "").rstrip("/")
    if not base:
        raise RuntimeError("BITQUERY_URL not configured")
    if base.endswith("/graphql"):
        return base
    return f"{base}/graphql"


def bitquery_query(
    query: str, variables: dict | None = None, timeout: int = 15
) -> dict:
    if not BITQUERY_API_KEY:
        raise RuntimeError("BITQUERY_API_KEY not configured")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {BITQUERY_API_KEY}",
    }
    payload: dict = {"query": query}
    if variables:
        payload["variables"] = variables

    try:
        resp = requests.post(
            _resolve_endpoint(),
            json=payload,
            headers=headers,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Bitquery request failed: {exc}") from exc

    if resp.status_code < 200 or resp.status_code >= 300:
        raise RuntimeError(f"Bitquery HTTP {resp.status_code}: {resp.text}")

    try:
        data = resp.json()
    except ValueError as exc:
        raise RuntimeError("Bitquery response was not valid JSON") from exc

    if "errors" in data:
        raise RuntimeError(f"Bitquery error: {data['errors']}")

    return data.get("data", {})


__all__ = ["bitquery_query", "BITQUERY_URL", "BITQUERY_API_KEY"]
