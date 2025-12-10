
from unittest.mock import patch
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from backend.models import Account, Subscription

# Tests for backend/api/accounts.py

def test_list_accounts(test_client: TestClient, test_db, mock_auth):
    acct1 = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Cash Wallet",
        currency="USD",
        balance=Decimal("100.00")
    )
    acct2 = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Chase",
        account_name="Checking",
        currency="USD",
        balance=Decimal("5000.00"),
        secret_ref="plaid_token"
    )
    test_db.add_all([acct1, acct2])
    test_db.commit()

    response = test_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [a["account_name"] for a in data]
    assert "Cash Wallet" in names
    assert "Checking" in names

def test_create_manual_account(test_client: TestClient, test_db, mock_auth):
    payload = {
        "account_type": "manual",
        "provider": "Safe",
        "account_name": "My Safe"
    }
    response = test_client.post("/api/accounts/manual", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["account_name"] == "My Safe"
    assert data["account_type"] == "manual"
    
    # Verify DB
    acct = test_db.query(Account).filter(Account.id == data["id"]).first()
    assert acct is not None

def test_update_account(test_client: TestClient, test_db, mock_auth):
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Old Name",
        balance=Decimal("50.00")
    )
    test_db.add(acct)
    test_db.commit()
    
    payload = {"account_name": "New Name", "balance": 150.50}
    response = test_client.patch(f"/api/accounts/{acct.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["account_name"] == "New Name"
    assert float(data["balance"]) == 150.5 # JSON serialization might default to float/string representation
    
    test_db.refresh(acct)
    assert acct.account_name == "New Name"
    # Compare with tolerance or type conversion if needed, but Decimal("150.5") matches
    assert acct.balance == Decimal("150.50")

def test_delete_account(test_client: TestClient, test_db, mock_auth):
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="To Delete"
    )
    test_db.add(acct)
    test_db.commit()
    
    response = test_client.delete(f"/api/accounts/{acct.id}")
    assert response.status_code == 200
    
    db_acct = test_db.query(Account).filter(Account.id == acct.id).first()
    assert db_acct is None

def test_sync_account(test_client: TestClient, test_db, mock_auth):
    # Setup traditional account
    acct = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Bank",
        account_name="Bank Acct",
        secret_ref="access-token-123",
        account_number_masked="1234",
        currency="USD"
    )
    # Add subscription (pro) to bypass free tier rate limits
    sub = Subscription(uid=mock_auth.uid, plan="pro", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.add(acct)
    test_db.commit()

    # Mock fetch_transactions and fetch_accounts
    mock_txns = [
        {
            "transaction_id": "txn_1",
            "date": date(2023, 1, 1),
            "amount": 50.0,
            "currency": "USD",
            "category": "Food",
            "merchant_name": "Burger King",
            "name": "Burger King #123"
        }
    ]
    mock_accts = [
        {
            "mask": "1234",
            "balance_current": 1000.0,
            "currency": "USD"
        }
    ]
    
    with patch("backend.api.accounts.fetch_transactions", return_value=mock_txns), \
         patch("backend.api.accounts.fetch_accounts", return_value=mock_accts):
        
        response = test_client.post(f"/api/accounts/{acct.id}/sync?start_date=2023-01-01")
        
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 1
    assert data["new_transactions"] == 1
