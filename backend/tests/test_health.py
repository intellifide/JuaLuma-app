# Updated 2025-12-11 01:48 CST by ChatGPT
import pytest
from pydantic import ValidationError

from backend.core.config import AppSettings


def test_health_reports_database_connected(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"


def test_settings_validation_requires_required_fields(monkeypatch):
    for key in ("DATABASE_URL", "PLAID_CLIENT_ID", "PLAID_SECRET", "FRONTEND_URL"):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(ValidationError):
        AppSettings(
            _env_file=None,
            database_url=None,  # type: ignore[arg-type]
            plaid_client_id=None,  # type: ignore[arg-type]
            plaid_secret=None,  # type: ignore[arg-type]
            frontend_url="",
        )
