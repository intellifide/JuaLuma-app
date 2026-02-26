from __future__ import annotations

from datetime import UTC, datetime

from backend.models import PlaidItem


def test_update_link_token_requires_existing_item(test_client, test_db, mock_auth):
    response = test_client.post(
        "/api/plaid/link-token/update",
        json={"item_id": "missing-item"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Plaid item was not found."


def test_update_link_token_uses_item_access_token(
    test_client, test_db, mock_auth, monkeypatch
):
    item = PlaidItem(
        uid=mock_auth.uid,
        item_id="item-test-123",
        institution_name="Test Bank",
        secret_ref="secret-ref-1",
        sync_status="active",
        sync_needed_at=datetime.now(UTC),
        is_active=True,
    )
    test_db.add(item)
    test_db.commit()

    captured: dict[str, object] = {}

    def _fake_get_secret(ref: str, *, uid: str | None = None) -> str:
        captured["secret_ref"] = ref
        captured["uid"] = uid
        return "access-token-from-store"

    def _fake_create_link_token(
        user_id: str,
        products: list[str],
        *,
        days_requested: int | None = None,
        access_token: str | None = None,
    ) -> tuple[str, str]:
        captured["user_id"] = user_id
        captured["products"] = products
        captured["days_requested"] = days_requested
        captured["access_token"] = access_token
        return ("link-update-token", "2026-12-31T23:59:59Z")

    monkeypatch.setattr("backend.api.plaid.get_secret", _fake_get_secret)
    monkeypatch.setattr("backend.api.plaid.create_link_token", _fake_create_link_token)

    response = test_client.post(
        "/api/plaid/link-token/update",
        json={"item_id": "item-test-123"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "link_token": "link-update-token",
        "expiration": "2026-12-31T23:59:59Z",
    }
    assert captured == {
        "secret_ref": "secret-ref-1",
        "uid": mock_auth.uid,
        "user_id": mock_auth.uid,
        "products": [],
        "days_requested": None,
        "access_token": "access-token-from-store",
    }
