# CORE PURPOSE: Test for account endpoints including household scope and permission checks.
# LAST MODIFIED: 2026-01-18 23:35 CST

from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.models import Account, Household, HouseholdMember, Subscription, Transaction, User

# Tests for backend/api/accounts.py


def test_list_accounts(test_client: TestClient, test_db, mock_auth):
    acct1 = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Cash Wallet",
        currency="USD",
        balance=Decimal("100.00"),
    )
    acct2 = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Chase",
        account_name="Checking",
        currency="USD",
        balance=Decimal("5000.00"),
        secret_ref="plaid_token",
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
        "account_name": "My Safe",
        "balance": 2450.75,
    }
    response = test_client.post("/api/accounts/manual", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["account_name"] == "My Safe"
    assert data["account_type"] == "manual"
    assert float(data["balance"]) == 2450.75

    # Verify DB
    acct = test_db.query(Account).filter(Account.id == data["id"]).first()
    assert acct is not None
    assert acct.balance == Decimal("2450.75")


def test_update_account(test_client: TestClient, test_db, mock_auth):
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Old Name",
        balance=Decimal("50.00"),
    )
    test_db.add(acct)
    test_db.commit()

    payload = {"account_name": "New Name", "balance": 150.50}
    response = test_client.patch(f"/api/accounts/{acct.id}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["account_name"] == "New Name"
    assert (
        float(data["balance"]) == 150.5
    )  # JSON serialization might default to float/string representation

    test_db.refresh(acct)
    assert acct.account_name == "New Name"
    # Compare with tolerance or type conversion if needed, but Decimal("150.5") matches
    assert acct.balance == Decimal("150.50")


def test_delete_account(test_client: TestClient, test_db, mock_auth):
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="To Delete",
    )
    test_db.add(acct)
    test_db.commit()

    response = test_client.delete(f"/api/accounts/{acct.id}")
    assert response.status_code == 200

    db_acct = test_db.query(Account).filter(Account.id == acct.id).first()
    assert db_acct is None


def test_sync_account(test_client: TestClient, test_db, mock_auth):
    # Setup CEX account (manual sync remains enabled for non-Plaid providers)
    acct = Account(
        uid=mock_auth.uid,
        account_type="cex",
        provider="coinbaseadvanced",
        account_name="CEX Acct",
        secret_ref='{"apiKey":"k","secret":"s"}',
        currency="USD",
    )
    # Add subscription (pro) to bypass free tier rate limits
    sub = Subscription(uid=mock_auth.uid, plan="pro", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.add(acct)
    test_db.commit()

    # Mock provider dispatch for CEX sync
    mock_txns = [
        {
            "transaction_id": "txn_1",
            "date": date(2023, 1, 1),
            "amount": 50.0,
            "currency": "USD",
            "category": "Food",
            "merchant_name": "Burger King",
            "name": "Burger King #123",
        }
        ,
        {
            "transaction_id": "txn_2",
            "date": date(2023, 1, 2),
            "amount": 100.0,
            "currency": "USD",
            "category": "Income",
            "merchant_name": "Employer",
            "name": "Payroll",
            "direction": "inflow",
        },
    ]

    with patch("backend.api.accounts._sync_cex", return_value=mock_txns):
        response = test_client.post(
            f"/api/accounts/{acct.id}/sync?start_date=2023-01-01"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 2
    assert data["new_transactions"] == 2

    txns = (
        test_db.query(Transaction)
        .filter(Transaction.uid == mock_auth.uid, Transaction.account_id == acct.id)
        .all()
    )
    assert len(txns) == 2
    by_external_id = {t.external_id: t for t in txns}
    # CEX/Web3 direction-aware sign normalization.
    assert by_external_id["txn_1"].amount == Decimal("50.00")
    assert by_external_id["txn_2"].amount == Decimal("100.00")


def test_update_account_assignments(test_client: TestClient, test_db, mock_auth):
    # Setup: Create a household for the current user
    household = Household(owner_uid=mock_auth.uid, name="Test Household")
    test_db.add(household)
    test_db.flush()

    # Add owner as member
    owner_member = HouseholdMember(
        household_id=household.id,
        uid=mock_auth.uid,
        role="admin",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    test_db.add(owner_member)

    # Add another member
    other_user = User(
        uid="other_user_456",
        email="other@example.com",
        role="user",
        theme_pref="light",
        currency_pref="USD",
    )
    test_db.add(other_user)
    other_member = HouseholdMember(
        household_id=household.id,
        uid="other_user_456",
        role="member",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    test_db.add(other_member)
    test_db.commit()

    # Create an account
    acct = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Family Savings",
        balance=Decimal("1000.00"),
    )
    test_db.add(acct)
    test_db.commit()

    # Case 1: Update with valid assigned_member_uid
    payload = {"assigned_member_uid": "other_user_456", "custom_label": "Kid's Fund"}
    response = test_client.patch(f"/api/accounts/{acct.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["assigned_member_uid"] == "other_user_456"
    assert data["custom_label"] == "Kid's Fund"

    # Verify DB
    test_db.refresh(acct)
    assert acct.assigned_member_uid == "other_user_456"

    # Case 2: Update with INVALID assigned_member_uid (not in household)
    payload = {"assigned_member_uid": "random_stranger"}
    response = test_client.patch(f"/api/accounts/{acct.id}", json=payload)
    assert response.status_code == 400
    assert "could not be found in your household" in response.json()["detail"]

    # Case 3: Update with OWNER uid (should be valid)
    payload = {"assigned_member_uid": mock_auth.uid}
    response = test_client.patch(f"/api/accounts/{acct.id}", json=payload)
    assert response.status_code == 200
    test_db.refresh(acct)
    assert acct.assigned_member_uid == mock_auth.uid


def test_list_accounts_household_scope_includes_member_accounts(
    test_client: TestClient, test_db, mock_auth
):
    household = Household(owner_uid=mock_auth.uid, name="Test Household")
    test_db.add(household)
    test_db.flush()

    owner_member = HouseholdMember(
        household_id=household.id,
        uid=mock_auth.uid,
        role="admin",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    other_user = User(
        uid="member_user_999",
        email="member@example.com",
        role="user",
        theme_pref="light",
        currency_pref="USD",
    )
    other_member = HouseholdMember(
        household_id=household.id,
        uid=other_user.uid,
        role="member",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    test_db.add_all([owner_member, other_user, other_member])

    owner_account = Account(
        uid=mock_auth.uid,
        account_type="manual",
        provider="manual",
        account_name="Owner Account",
        balance=Decimal("100.00"),
    )
    member_account = Account(
        uid=other_user.uid,
        account_type="manual",
        provider="manual",
        account_name="Member Account",
        balance=Decimal("50.00"),
    )
    test_db.add_all([owner_account, member_account])
    test_db.commit()

    response = test_client.get("/api/accounts?scope=household")
    assert response.status_code == 200
    data = response.json()
    ids = {item["id"] for item in data}
    assert str(owner_account.id) in ids
    assert str(member_account.id) in ids

    response = test_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    ids = {item["id"] for item in data}
    assert str(owner_account.id) in ids
    assert str(member_account.id) not in ids


def test_list_accounts_requires_household_membership_for_assignments(
    test_client: TestClient, test_db, mock_auth
):
    admin_user = User(
        uid="admin_user_999",
        email="admin@example.com",
        role="user",
        theme_pref="light",
        currency_pref="USD",
    )
    test_db.add(admin_user)

    household = Household(owner_uid=admin_user.uid, name="Household A")
    test_db.add(household)
    test_db.flush()

    admin_member = HouseholdMember(
        household_id=household.id,
        uid=admin_user.uid,
        role="admin",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    member = HouseholdMember(
        household_id=household.id,
        uid=mock_auth.uid,
        role="member",
        joined_at=datetime.now(UTC),
        can_view_household=True,
        ai_access_enabled=True,
    )
    test_db.add_all([admin_member, member])

    acct = Account(
        uid=admin_user.uid,
        account_type="manual",
        provider="manual",
        account_name="Admin Account",
        balance=Decimal("10.00"),
        assigned_member_uid=mock_auth.uid,
    )
    test_db.add(acct)
    test_db.commit()

    response = test_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert any(a["id"] == str(acct.id) for a in data)

    test_db.delete(member)
    test_db.commit()

    response = test_client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert all(a["id"] != str(acct.id) for a in data)
