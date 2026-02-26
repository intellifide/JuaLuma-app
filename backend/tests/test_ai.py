# Last Modified: 2026-01-18 03:16 CST
import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.core import settings
from backend.models import LLMLog, Subscription
from backend.services.ai import (
    _anniversary_period_window,
    _resolve_consumed_tokens,
    get_quota_snapshot_sync,
    resolve_model_routing,
)

# Tests for backend/api/ai.py


@pytest.fixture
def mock_ai_services():
    with (
        patch("backend.api.ai.check_rate_limit", new_callable=AsyncMock) as mock_limit,
        patch(
            "backend.api.ai.generate_chat_response", new_callable=AsyncMock
        ) as mock_gen,
        patch("backend.api.ai.get_financial_context", new_callable=AsyncMock) as mock_rag,
        patch(
            "backend.api.ai.get_uploaded_documents_context", new_callable=AsyncMock
        ) as mock_upload_context,
        patch("backend.api.ai.encrypt_prompt") as mock_encrypt,
        patch("backend.api.ai.decrypt_prompt") as mock_decrypt,
    ):
        mock_limit.return_value = 5  # 5 used today
        mock_gen.return_value = {
            "response": "This is AI response",
            "effective_model": "gemini-2.5-flash",
            "fallback_applied": False,
            "fallback_reason": None,
            "fallback_message": None,
        }
        mock_rag.return_value = "Retrieved Context"
        mock_upload_context.return_value = ""
        mock_encrypt.return_value = "encrypted_prompt"
        mock_decrypt.return_value = "Decrypted Prompt"

        yield {
            "check_rate_limit": mock_limit,
            "generate_chat_response": mock_gen,
            "get_rag_context": mock_rag,
            "get_uploaded_context": mock_upload_context,
            "encrypt_prompt": mock_encrypt,
            "decrypt_prompt": mock_decrypt,
        }


def test_chat_success(test_client: TestClient, test_db, mock_auth, mock_ai_services):
    # Ensure subscription (paid tier for RAG check)
    sub = Subscription(uid=mock_auth.uid, plan="pro", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()

    payload = {"message": "Hello AI"}
    response = test_client.post("/api/ai/chat", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "This is AI response"
    assert data["effective_model"] == "gemini-2.5-flash"
    assert data["fallback_applied"] is False
    assert data["fallback_reason"] is None
    assert data["fallback_message"] is None

    # Verify calls
    mock_ai_services["check_rate_limit"].assert_called_once_with(mock_auth.uid)
    mock_ai_services["get_rag_context"].assert_called_once()
    actual_args = mock_ai_services["get_rag_context"].call_args
    assert actual_args.args[0] == mock_auth.uid
    assert actual_args.args[1] == "Hello AI"

    mock_ai_services["generate_chat_response"].assert_called_once()
    mock_ai_services[
        "encrypt_prompt"
    ].assert_called()  # Called twice (prompt + response)

    # Verify DB logging
    log = test_db.query(LLMLog).order_by(LLMLog.id.desc()).first()
    assert log is not None
    # log.encrypted_response should range match what mock returned if encrypted?
    # mock_encrypt returns b"encrypted_prompt".
    assert (
        log.encrypted_response == b"encrypted_prompt"
    )  # Mock encrypt returns this bytes
    assert log.encrypted_prompt == b"encrypted_prompt"
    # context_used not in model
    # assert log.context_used is True


def test_chat_quota_exceeded(test_client: TestClient, test_db, mock_auth):
    # Needs explicit mock for this test to raise exception
    with patch(
        "backend.api.ai.check_rate_limit",
        side_effect=HTTPException(status_code=429, detail="Quota exceeded"),
    ):
        # Ensure minimal setup if other deps are hit before rate limit (e.g. subscription)
        sub = Subscription(
            uid=mock_auth.uid, plan="free", status="active", ai_quota_used=0
        )
        test_db.add(sub)
        test_db.commit()

        payload = {"message": "Hello AI"}
        response = test_client.post("/api/ai/chat", json=payload)

    assert response.status_code == 429
    assert "Quota exceeded" in response.json()["detail"]


def test_chat_free_tier_no_rag(
    test_client: TestClient, test_db, mock_auth, mock_ai_services
):
    # Ensure subscription (free tier)
    sub = Subscription(uid=mock_auth.uid, plan="free", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()

    payload = {"message": "Hello Free AI"}
    response = test_client.post("/api/ai/chat", json=payload)

    assert response.status_code == 200

    # Verify RAG NOT called
    mock_ai_services["get_rag_context"].assert_not_called()
    mock_ai_services["get_uploaded_context"].assert_called_once()
    mock_ai_services["generate_chat_response"].assert_called_once()

    # Verify context_used is False in result call args (kwargs 'context')
    # generate_chat_response(prompt=message, context=context, user_id=user_id)
    call_kwargs = mock_ai_services["generate_chat_response"].call_args.kwargs
    assert call_kwargs.get("context") == ""

    log = test_db.query(LLMLog).order_by(LLMLog.id.desc()).first()
    assert log is None


def test_chat_history(test_client: TestClient, test_db, mock_auth, mock_ai_services):
    sub = Subscription(uid=mock_auth.uid, plan="pro", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()

    # Setup log entries
    log1 = LLMLog(
        uid=mock_auth.uid,
        encrypted_prompt=b"enc1",
        encrypted_response=b"resp1",
        model="gemini-pro",
        tokens=0,
        user_dek_ref=mock_auth.uid,
        archived=False,
    )
    log2 = LLMLog(
        uid=mock_auth.uid,
        encrypted_prompt=b"enc2",
        encrypted_response=b"resp2",
        model="gemini-pro",
        tokens=0,
        user_dek_ref=mock_auth.uid,
        archived=False,
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    response = test_client.get("/api/ai/history")

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2

    # Decryption mock returns "Decrypted Prompt" for everything
    # So both prompts and responses will be "Decrypted Prompt"
    prompts = {m["prompt"] for m in data["messages"]}
    assert "Decrypted Prompt" in prompts

    # Verify decryption called 4 times (2 logs * (prompt + response))
    assert mock_ai_services["decrypt_prompt"].call_count == 4


def test_resolve_model_routing_free_default():
    result = resolve_model_routing(tier="free", usage_today=0, limit=10)
    assert result["model"] == settings.ai_free_model
    assert result["fallback_applied"] is False
    assert result["fallback_reason"] is None


def test_resolve_model_routing_paid_default():
    result = resolve_model_routing(tier="pro", usage_today=3, limit=40)
    assert result["model"] == settings.ai_paid_model
    assert result["fallback_applied"] is False
    assert result["fallback_reason"] is None


def test_resolve_model_routing_paid_limit_exhausted_fallback():
    result = resolve_model_routing(tier="pro", usage_today=40, limit=40)
    assert result["model"] == settings.ai_paid_fallback_model
    assert result["fallback_applied"] is True
    assert result["fallback_reason"] == "paid_premium_limit_exhausted"
    assert "Premium AI limit reached" in (result["fallback_message"] or "")


def test_anniversary_period_window_uses_anchor_day_not_calendar_midnight():
    now = datetime.datetime(2026, 2, 20, 9, 30, tzinfo=datetime.UTC)
    period_start, period_end = _anniversary_period_window(now, anchor_day=15)
    assert period_start == datetime.datetime(2026, 2, 15, 0, 0, tzinfo=datetime.UTC)
    assert period_end == datetime.datetime(2026, 3, 15, 0, 0, tzinfo=datetime.UTC)


def test_anniversary_period_window_clamps_for_short_months():
    now = datetime.datetime(2026, 2, 15, 0, 0, tzinfo=datetime.UTC)
    period_start, period_end = _anniversary_period_window(now, anchor_day=31)
    assert period_start == datetime.datetime(2026, 1, 31, 0, 0, tzinfo=datetime.UTC)
    assert period_end == datetime.datetime(2026, 2, 28, 0, 0, tzinfo=datetime.UTC)


def test_anniversary_period_window_anchor_boundary_has_no_off_by_one():
    now = datetime.datetime(2026, 3, 10, 0, 0, tzinfo=datetime.UTC)
    period_start, period_end = _anniversary_period_window(now, anchor_day=10)
    assert period_start == datetime.datetime(2026, 3, 10, 0, 0, tzinfo=datetime.UTC)
    assert period_end == datetime.datetime(2026, 4, 10, 0, 0, tzinfo=datetime.UTC)


def test_anniversary_period_window_stays_stable_through_dst_calendar_dates():
    # DST shifts in local timezones must not affect UTC anniversary windows.
    now = datetime.datetime(2026, 3, 8, 7, 30, tzinfo=datetime.UTC)
    period_start, period_end = _anniversary_period_window(now, anchor_day=8)
    assert period_start == datetime.datetime(2026, 3, 8, 0, 0, tzinfo=datetime.UTC)
    assert period_end == datetime.datetime(2026, 4, 8, 0, 0, tzinfo=datetime.UTC)


def test_resolve_consumed_tokens_prefers_usage_metadata():
    prompt_tokens, response_tokens, consumed = _resolve_consumed_tokens(
        prompt_text="hello world",
        response_text="response",
        prompt_tokens=123,
        response_tokens=45,
    )
    assert prompt_tokens == 123
    assert response_tokens == 45
    assert consumed == 168


def test_resolve_consumed_tokens_estimates_when_metadata_missing():
    prompt_tokens, response_tokens, consumed = _resolve_consumed_tokens(
        prompt_text="a" * 40,
        response_text="b" * 20,
        prompt_tokens=0,
        response_tokens=0,
    )
    assert prompt_tokens > 0
    assert response_tokens > 0
    assert consumed == prompt_tokens + response_tokens


class _FakeSnapshot:
    def __init__(self, data: dict[str, int]):
        self._data = data
        self.exists = True

    def get(self, key: str):
        return self._data.get(key)


class _FakeDocRef:
    def __init__(self, snapshot: _FakeSnapshot):
        self._snapshot = snapshot

    def get(self):
        return self._snapshot


def test_quota_snapshot_recalculates_immediately_on_upgrade_with_carry_forward(monkeypatch):
    period_start = datetime.datetime(2026, 2, 10, 0, 0, tzinfo=datetime.UTC)
    period_end = datetime.datetime(2026, 3, 10, 0, 0, tzinfo=datetime.UTC)
    snapshot = _FakeSnapshot({"tokens_used": 1200})
    subscription = SimpleNamespace(
        created_at=datetime.datetime(2026, 1, 10, 0, 0, tzinfo=datetime.UTC),
        renew_at=None,
    )

    monkeypatch.setattr(
        "backend.services.ai._anniversary_period_window",
        lambda _now, _anchor: (period_start, period_end),
    )
    monkeypatch.setattr("backend.services.ai._resolve_anchor_day", lambda _tier, _sub: 10)
    monkeypatch.setattr(
        "backend.services.ai._quota_doc_ref",
        lambda _user_id, _period_start: _FakeDocRef(snapshot),
    )
    monkeypatch.setattr(
        "backend.services.ai._resolve_tier_and_subscription",
        lambda _user_id: ("free", subscription),
    )
    free_quota = get_quota_snapshot_sync("u-1")

    monkeypatch.setattr(
        "backend.services.ai._resolve_tier_and_subscription",
        lambda _user_id: ("pro", subscription),
    )
    pro_quota = get_quota_snapshot_sync("u-1")

    assert free_quota["used"] == 1200
    assert pro_quota["used"] == 1200
    assert pro_quota["limit"] > free_quota["limit"]
    assert pro_quota["resets_at"] == free_quota["resets_at"]
    assert 0 <= free_quota["usage_progress"] <= 1
    assert free_quota["usage_copy"] == "AI usage this period"


def test_quota_snapshot_recalculates_immediately_on_downgrade_without_reset(monkeypatch):
    period_start = datetime.datetime(2026, 2, 10, 0, 0, tzinfo=datetime.UTC)
    period_end = datetime.datetime(2026, 3, 10, 0, 0, tzinfo=datetime.UTC)
    snapshot = _FakeSnapshot({"tokens_used": 4200})
    subscription = SimpleNamespace(
        created_at=datetime.datetime(2026, 1, 10, 0, 0, tzinfo=datetime.UTC),
        renew_at=None,
    )

    monkeypatch.setattr(
        "backend.services.ai._anniversary_period_window",
        lambda _now, _anchor: (period_start, period_end),
    )
    monkeypatch.setattr("backend.services.ai._resolve_anchor_day", lambda _tier, _sub: 10)
    monkeypatch.setattr(
        "backend.services.ai._quota_doc_ref",
        lambda _user_id, _period_start: _FakeDocRef(snapshot),
    )
    monkeypatch.setattr(
        "backend.services.ai._resolve_tier_and_subscription",
        lambda _user_id: ("pro", subscription),
    )
    pro_quota = get_quota_snapshot_sync("u-2")

    monkeypatch.setattr(
        "backend.services.ai._resolve_tier_and_subscription",
        lambda _user_id: ("free", subscription),
    )
    free_quota = get_quota_snapshot_sync("u-2")

    assert pro_quota["used"] == 4200
    assert free_quota["used"] == 4200
    assert free_quota["limit"] < pro_quota["limit"]
    assert free_quota["resets_at"] == pro_quota["resets_at"]
    assert 0 <= free_quota["usage_progress"] <= 1
    assert free_quota["usage_copy"] == "AI usage this period"


def test_quota_snapshot_free_tier_uses_anniversary_anchor_and_reports_period_end(
    monkeypatch,
):
    period_start = datetime.datetime(2026, 3, 9, 0, 0, tzinfo=datetime.UTC)
    period_end = datetime.datetime(2026, 4, 9, 0, 0, tzinfo=datetime.UTC)
    snapshot = _FakeSnapshot({"tokens_used": 333})
    subscription = SimpleNamespace(
        created_at=datetime.datetime(2025, 12, 9, 0, 0, tzinfo=datetime.UTC),
        renew_at=datetime.datetime(2026, 4, 25, 0, 0, tzinfo=datetime.UTC),
    )

    observed: dict[str, int] = {}

    def _window_with_capture(_now: datetime.datetime, anchor: int):
        observed["anchor_day"] = anchor
        return period_start, period_end

    monkeypatch.setattr("backend.services.ai._anniversary_period_window", _window_with_capture)
    monkeypatch.setattr(
        "backend.services.ai._resolve_tier_and_subscription",
        lambda _user_id: ("free", subscription),
    )
    monkeypatch.setattr(
        "backend.services.ai._quota_doc_ref",
        lambda _user_id, _period_start: _FakeDocRef(snapshot),
    )

    quota = get_quota_snapshot_sync("u-free")

    assert observed["anchor_day"] == 9
    assert quota["used"] == 333
    assert quota["resets_at"] == period_end.isoformat()
