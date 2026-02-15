import logging
import os
import sys
import uuid
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

# Skip in pytest runs unless explicitly enabled.
if os.getenv("RUN_SCRIPTS_TESTS") != "1":
    pytest.skip(
        "Skipping script-style tests; set RUN_SCRIPTS_TESTS=1 to enable.",
        allow_module_level=True,
    )

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import datetime

from backend.main import app
from backend.middleware.auth import get_current_user
from backend.models import (
    Account,
    Household,
    HouseholdMember,
    SessionLocal,
    Subscription,
    Transaction,
    User,
)

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Monkeypatch httpx.Client to ignore 'app' argument passed by older starlette versions
# This is needed because local env might have mismatching versions


_orig_client_init = httpx.Client.__init__

def _new_client_init(self, *args, **kwargs):
    if "app" in kwargs:
        kwargs.pop("app")
    _orig_client_init(self, *args, **kwargs)

httpx.Client.__init__ = _new_client_init

client = TestClient(app)

def setup_data(db):
    """
    Creates:
    1. Owner User (Ultimate)
    2. Member User
    3. Household linking them
    4. Accounts (Required for Transactions)
    5. Transactions for both
    """
    owner_uid = f"owner_{uuid.uuid4().hex[:8]}"
    member_uid = f"member_{uuid.uuid4().hex[:8]}"

    # Create Users
    owner = User(uid=owner_uid, email=f"{owner_uid}@test.com", role="user", status="active")
    member = User(uid=member_uid, email=f"{member_uid}@test.com", role="user", status="active")

    # Create Subscription for Owner (Ultimate to allow household features)
    sub = Subscription(uid=owner_uid, plan="ultimate", status="active")

    # Create Household
    household = Household(name="Test Household", owner_uid=owner_uid)
    db.add_all([owner, member, sub, household])
    db.commit()
    db.refresh(household)

    # Link Members
    mem1 = HouseholdMember(uid=owner_uid, household_id=household.id, role="owner", joined_at=date.today())
    mem2 = HouseholdMember(uid=member_uid, household_id=household.id, role="member", joined_at=date.today())
    db.add_all([mem1, mem2])

    # Create Accounts
    acc1 = Account(uid=owner_uid, provider="test", account_name="Owner Bank")
    acc2 = Account(uid=member_uid, provider="test", account_name="Member Bank")
    db.add_all([acc1, acc2])
    db.commit()
    db.refresh(acc1)
    db.refresh(acc2)

    # Create Transactions
    t1 = Transaction(uid=owner_uid, account_id=acc1.id, description="TEST_TXN_OWNER", amount=100.00, ts=datetime.now(), category="Food")
    t2 = Transaction(uid=member_uid, account_id=acc2.id, description="TEST_TXN_MEMBER", amount=50.00, ts=datetime.now(), category="Food")
    db.add_all([t1, t2])

    db.commit()
    logger.info(f"Setup Complete. Owner: {owner_uid}, Member: {member_uid}")

    return owner_uid, member_uid

def test_transactions(db, owner_uid, member_uid):
    # Debug: Verify DB Data
    from backend.services.household_service import get_household_member_uids

    owner_txns = db.query(Transaction).filter(Transaction.uid == owner_uid).all()
    member_txns = db.query(Transaction).filter(Transaction.uid == member_uid).all()
    logger.info(f"DEBUG: Owner Transactions in DB: {len(owner_txns)}")
    logger.info(f"DEBUG: Member Transactions in DB: {len(member_txns)}")

    uids = get_household_member_uids(db, owner_uid)
    logger.info(f"DEBUG: Household UIDs for owner: {uids}")

    # Override get_current_user to return the owner
    owner_user = db.query(User).filter(User.uid == owner_uid).first()
    app.dependency_overrides[get_current_user] = lambda: owner_user

    try:
        # Test 1: Personal Scope
        logger.info("Testing Scope: PERSONAL")
        res = client.get("/api/transactions", params={"scope": "personal"})
        if res.status_code != 200:
            logger.error(f"Failed Personal: {res.text}")
        assert res.status_code == 200
        data = res.json()
        txns = data.get("transactions", [])
        logger.info(f"Personal Count: {len(txns)}") # Expect 1 (Owner)

        found_owner = any(t['description'] == "TEST_TXN_OWNER" for t in txns)
        found_member = any(t['description'] == "TEST_TXN_MEMBER" for t in txns)

        if found_owner and not found_member:
            logger.info("PASS: Personal scope shows only owner transactions.")
        else:
            logger.error(f"FAIL: Personal scope. Owner Found: {found_owner}, Member Found: {found_member}")

        # Test 2: Household Scope
        logger.info("Testing Scope: HOUSEHOLD")
        res = client.get("/api/transactions", params={"scope": "household"})
        if res.status_code != 200:
            logger.error(f"Failed Household: {res.text}")
        assert res.status_code == 200
        data = res.json()
        txns = data.get("transactions", [])
        logger.info(f"Household Count: {len(txns)}") # Expect 2 (Owner + Member)

        found_owner = any(t['description'] == "TEST_TXN_OWNER" for t in txns)
        found_member = any(t['description'] == "TEST_TXN_MEMBER" for t in txns)

        if found_owner and found_member:
            logger.info("PASS: Household scope shows BOTH transactions.")
        else:
            logger.error(f"FAIL: Household scope. Owner Found: {found_owner}, Member Found: {found_member}")

    finally:
        app.dependency_overrides.clear()

if __name__ == "__main__":
    # Ensure current working directory is project root for module resolution if needed
    # But usually sys.path append above handles it.

    db = SessionLocal()
    try:
        owner, member = setup_data(db)
        test_transactions(db, owner, member)

        # Optional: Cleanup?
        # For now, we leave data or we can delete it.
        # Leaving it for inspection is fine in local/dev.
    except Exception:
        logger.exception("Test Execution Failed")
    finally:
        db.close()
