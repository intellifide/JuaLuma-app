from fastapi.testclient import TestClient

from backend.models import Account, Subscription


def _set_essential_subscription(test_db, uid: str) -> None:
    subscription = Subscription(uid=uid, plan="essential_monthly", status="active")
    test_db.add(subscription)
    test_db.commit()


def _mock_plaid_accounts(count: int) -> list[dict[str, object]]:
    return [
        {
            "account_id": f"acct-{idx}",
            "name": f"Account {idx}",
            "mask": f"{1000 + idx}",
            "type": "depository",
            "subtype": "checking",
            "balance_current": 100 + idx,
            "currency": "USD",
        }
        for idx in range(count)
    ]


def test_plaid_exchange_enforces_plaid_account_limit(
    test_client: TestClient,
    test_db,
    mock_auth,
    monkeypatch,
):
    _set_essential_subscription(test_db, mock_auth.uid)

    monkeypatch.setattr("backend.api.plaid.exchange_public_token", lambda _: ("access-token", "item-1"))
    monkeypatch.setattr("backend.api.plaid.fetch_accounts", lambda _: _mock_plaid_accounts(6))
    monkeypatch.setattr("backend.api.plaid.store_secret", lambda *_args, **_kwargs: "secret-ref")

    response = test_client.post(
        "/api/plaid/exchange-token",
        json={
            "public_token": "public-token",
            "institution_name": "Plaid Test Bank",
            "selected_account_ids": [f"acct-{idx}" for idx in range(6)],
        },
    )

    assert response.status_code == 403
    assert "plaid-connected account" in response.json()["detail"].lower()
    assert test_db.query(Account).count() == 0


def test_plaid_exchange_allows_selected_accounts_within_limit(
    test_client: TestClient,
    test_db,
    mock_auth,
    monkeypatch,
):
    _set_essential_subscription(test_db, mock_auth.uid)

    monkeypatch.setattr("backend.api.plaid.exchange_public_token", lambda _: ("access-token", "item-2"))
    monkeypatch.setattr("backend.api.plaid.fetch_accounts", lambda _: _mock_plaid_accounts(6))
    monkeypatch.setattr("backend.api.plaid.store_secret", lambda *_args, **_kwargs: "secret-ref")

    response = test_client.post(
        "/api/plaid/exchange-token",
        json={
            "public_token": "public-token",
            "institution_name": "Plaid Test Bank",
            "selected_account_ids": [f"acct-{idx}" for idx in range(5)],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert len(payload["accounts"]) == 5
    assert test_db.query(Account).count() == 5


def test_plaid_exchange_rejects_unknown_selected_account_ids(
    test_client: TestClient,
    test_db,
    mock_auth,
    monkeypatch,
):
    _set_essential_subscription(test_db, mock_auth.uid)

    monkeypatch.setattr("backend.api.plaid.exchange_public_token", lambda _: ("access-token", "item-3"))
    monkeypatch.setattr("backend.api.plaid.fetch_accounts", lambda _: _mock_plaid_accounts(3))
    monkeypatch.setattr("backend.api.plaid.store_secret", lambda *_args, **_kwargs: "secret-ref")

    response = test_client.post(
        "/api/plaid/exchange-token",
        json={
            "public_token": "public-token",
            "institution_name": "Plaid Test Bank",
            "selected_account_ids": ["acct-0", "acct-does-not-exist"],
        },
    )

    assert response.status_code == 400
    assert "selected plaid accounts" in response.json()["detail"].lower()
    assert test_db.query(Account).count() == 0
