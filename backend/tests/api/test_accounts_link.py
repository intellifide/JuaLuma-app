from fastapi.testclient import TestClient

from backend.models import Account


def test_link_web3_account(test_client: TestClient, test_db, mock_auth):
    # Generates a valid eth address
    valid_address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # vitalik.eth

    payload = {
        "address": valid_address,
        "chain_id": 1,
        "account_name": "Vitalik Wallet",
    }

    response = test_client.post("/api/accounts/link/web3", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["account_name"] == "Vitalik Wallet"
    assert data["account_type"] == "web3"
    assert "id" in data

    # Verify DB
    acct = test_db.query(Account).filter(Account.id == data["id"]).first()
    assert acct is not None
    assert "d8dA6BF26964aF9D7eEd9e03E53415D37aA96045" in acct.secret_ref


def test_link_web3_account_invalid_address(test_client: TestClient, mock_auth):
    payload = {
        "address": "invalid-address",
        "chain_id": 1,
        "account_name": "Bad Wallet",
    }
    response = test_client.post("/api/accounts/link/web3", json=payload)
    assert (
        response.status_code == 400
    )  # Validation error (converted to 400 by custom handler)


def test_link_web3_duplicate(test_client: TestClient, test_db, mock_auth):
    valid_address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

    # First link
    test_client.post(
        "/api/accounts/link/web3",
        json={"address": valid_address, "chain_id": 1, "account_name": "Wallet 1"},
    )

    # Second link same user
    response = test_client.post(
        "/api/accounts/link/web3",
        json={"address": valid_address, "chain_id": 1, "account_name": "Wallet 2"},
    )
    assert response.status_code == 409
    assert "already linked" in response.json()["detail"]


def test_link_cex_account(test_client: TestClient, test_db, mock_auth):
    payload = {
        "exchange_id": "coinbase",
        "api_key": "mock-key",
        "api_secret": "mock-secret",
        "account_name": "My Coinbase",
    }

    # In local env, validation passes via MockConnectorClient
    response = test_client.post("/api/accounts/link/cex", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["account_type"] == "cex"
    assert data["provider"] == "coinbase"

    # Verify secret storage happened
    acct = test_db.query(Account).filter(Account.id == data["id"]).first()
    assert acct.secret_ref != '{"apiKey": "mock-key", "secret": "mock-secret"}'
    assert acct.secret_ref.startswith("file:")
