from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from plaid.exceptions import ApiException

from backend.core import settings
from backend.services import plaid as plaid_service


def _plaid_api_exception(payload: dict[str, object]) -> ApiException:
    exc = ApiException(status=400, reason="Bad Request")
    exc.body = json.dumps(payload)
    return exc


def test_create_link_token_retries_without_redirect_uri_on_allowlist_error(monkeypatch):
    calls: list[bool] = []

    class FakePlaidClient:
        def link_token_create(self, request):
            calls.append(bool(getattr(request, "redirect_uri", None)))
            if len(calls) == 1:
                raise _plaid_api_exception(
                    {
                        "error_code": "INVALID_FIELD",
                        "error_message": "OAuth redirect URI must be configured in the developer dashboard",
                    }
                )
            return SimpleNamespace(
                link_token="link-token-after-retry",
                expiration="2027-01-01T00:00:00Z",
            )

    monkeypatch.setattr(plaid_service, "get_plaid_client", lambda: FakePlaidClient())
    monkeypatch.setattr(
        settings,
        "plaid_redirect_uri",
        "https://frontend-app-77ybfmw7cq-uc.a.run.app/connect-accounts",
    )

    link_token, expiration = plaid_service.create_link_token(
        "user-123",
        products=["transactions"],
        days_requested=30,
    )

    assert link_token == "link-token-after-retry"
    assert expiration == "2027-01-01T00:00:00Z"
    assert calls == [True, False]


def test_create_link_token_redirect_uri_error_message_without_retry(monkeypatch):
    class FakePlaidClient:
        def link_token_create(self, request):
            raise _plaid_api_exception(
                {
                    "error_code": "INVALID_FIELD",
                    "error_message": "OAuth redirect URI must be configured in the developer dashboard",
                }
            )

    monkeypatch.setattr(plaid_service, "get_plaid_client", lambda: FakePlaidClient())
    monkeypatch.setattr(settings, "plaid_redirect_uri", None)

    with pytest.raises(RuntimeError, match="OAuth redirect URI is not configured"):
        plaid_service.create_link_token("user-123", products=["transactions"])
