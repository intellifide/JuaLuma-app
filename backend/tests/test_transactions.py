
import pytest
from datetime import datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from backend.models import Transaction, Account

# Tests for backend/api/transactions.py

@pytest.fixture
def sample_data(test_db, mock_auth):
    # Create an account
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Test Acct",
        balance=Decimal("1000.00"),
        currency="USD"
    )
    test_db.add(acct)
    test_db.commit()
    
    # Create transactions
    t1 = Transaction(
        uid=mock_auth.uid,
        account_id=acct.id,
        ts=datetime(2023, 1, 1, 10, 0, 0),
        amount=Decimal("10.00"),
        currency="USD",
        category="Food",
        merchant_name="Pizza Place",
        description="Lunch",
        is_manual=True,
        archived=False
    )
    t2 = Transaction(
        uid=mock_auth.uid,
        account_id=acct.id,
        ts=datetime(2023, 1, 2, 10, 0, 0),
        amount=Decimal("20.00"),
        currency="USD",
        category="Transport",
        merchant_name="Uber",
        description="Ride home",
        is_manual=False,
        archived=False
    )
    test_db.add_all([t1, t2])
    test_db.commit()
    return acct, t1, t2

def test_list_transactions(test_client: TestClient, sample_data):
    acct, t1, t2 = sample_data
    response = test_client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["transactions"]) == 2
    
    # Test filter by category
    response = test_client.get("/api/transactions?category=Food")
    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["merchant_name"] == "Pizza Place"

    # Test basic search (list_transactions has search param)
    response = test_client.get("/api/transactions?search=Pizza")
    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["merchant_name"] == "Pizza Place"

def test_update_transaction(test_client: TestClient, test_db, sample_data):
    acct, t1, t2 = sample_data
    payload = {"category": "Dining"}
    response = test_client.patch(f"/api/transactions/{t1.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Dining"
    
    test_db.refresh(t1)
    assert t1.category == "Dining"

def test_bulk_update(test_client: TestClient, test_db, sample_data):
    acct, t1, t2 = sample_data
    payload = {
        "transaction_ids": [str(t1.id), str(t2.id)],
        "updates": {"category": "Expense"}
    }
    response = test_client.patch("/api/transactions/bulk", json=payload)
    assert response.status_code == 200
    assert response.json()["updated_count"] == 2
    
    test_db.refresh(t1)
    test_db.refresh(t2)
    assert t1.category == "Expense"
    assert t2.category == "Expense"

def test_delete_transaction(test_client: TestClient, test_db, sample_data):
    acct, t1, t2 = sample_data
    # t1 is manual, can be deleted
    response = test_client.delete(f"/api/transactions/{t1.id}")
    assert response.status_code == 200
    
    test_db.refresh(t1)
    assert t1.archived is True

    # t2 is not manual, cannot be deleted
    response = test_client.delete(f"/api/transactions/{t2.id}")
    assert response.status_code == 400
