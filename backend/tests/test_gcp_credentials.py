import os
from unittest.mock import patch

from backend.utils.gcp_credentials import get_adc_credentials


def test_get_adc_credentials_unsets_service_account_email_env(monkeypatch):
    monkeypatch.setenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        "runtime-sa@jualuma-dev.iam.gserviceaccount.com",
    )
    captured = {}

    def _fake_default(*, scopes=None):
        _ = scopes
        captured["env_during_call"] = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        return ("creds", "proj")

    with patch("google.auth.default", side_effect=_fake_default):
        creds, project_id = get_adc_credentials(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )

    assert creds == "creds"
    assert project_id == "proj"
    assert captured["env_during_call"] is None
    assert (
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        == "runtime-sa@jualuma-dev.iam.gserviceaccount.com"
    )


def test_get_adc_credentials_keeps_file_path_env(monkeypatch):
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/fake-key.json")
    captured = {}

    def _fake_default(*, scopes=None):
        _ = scopes
        captured["env_during_call"] = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        return ("creds", "proj")

    with patch("google.auth.default", side_effect=_fake_default):
        get_adc_credentials(scopes=["https://www.googleapis.com/auth/cloud-platform"])

    assert captured["env_during_call"] == "/tmp/fake-key.json"

