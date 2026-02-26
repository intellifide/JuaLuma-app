"""Google credential helpers for Cloud Run keyless and file-based modes."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any


def _is_service_account_email_ref(value: str | None) -> bool:
    if not value:
        return False
    normalized = value.strip()
    return (
        normalized.endswith(".gserviceaccount.com")
        and "@" in normalized
        and not normalized.startswith("{")
        and "/" not in normalized
        and "\\" not in normalized
    )


@contextmanager
def _without_invalid_google_credentials_env():
    """
    Temporarily unset GOOGLE_APPLICATION_CREDENTIALS when it holds a service-account
    email string (keyless mode marker), not a file path or JSON payload.
    """
    key = "GOOGLE_APPLICATION_CREDENTIALS"
    raw = os.environ.get(key)
    if not _is_service_account_email_ref(raw):
        yield
        return

    backup = raw
    os.environ.pop(key, None)
    try:
        yield
    finally:
        os.environ[key] = backup


def get_adc_credentials(scopes: list[str] | None = None) -> tuple[Any, str | None]:
    """
    Resolve ADC safely for Cloud Run keyless mode and return (credentials, project_id).
    """
    import google.auth

    with _without_invalid_google_credentials_env():
        creds, project_id = google.auth.default(scopes=scopes)
    return creds, project_id

