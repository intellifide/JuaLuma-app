
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.middleware.auth import get_current_user
from backend.models import Account, Transaction, User
from backend.utils import get_db

# Mock User
mock_user = User(uid="cache_test_user", email="cache@example.com", role="user")

def override_get_current_user():
    return mock_user

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def mock_get_db(mock_db_session):
    def _mock_db():
        yield mock_db_session
    return _mock_db

@pytest.fixture
def override_dependencies(mock_get_db):
    app.dependency_overrides[get_db] = mock_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides = {}

@pytest.mark.asyncio
@patch("backend.api.transactions.invalidate_analytics_cache")
async def test_transaction_update_invalidates_cache(mock_invalidate, mock_db_session, override_dependencies):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User ID
        uid = "cache_test_user"
        txn_id = uuid.uuid4()

        # Mock DB Transaction
        txn = Transaction(
            id=txn_id,
            uid=uid,
            amount=Decimal("100.00"),
            currency="USD",
            ts=datetime.now(UTC),
            category="Food",
            merchant_name="Test Merchant",
            description="Lunch",
            account_id=uuid.uuid4(),
            is_manual=False,
            archived=False,
            raw_json={}
        )
        # Mock query return
        mock_db_session.query.return_value.filter.return_value.first.return_value = txn

        response = await client.patch(
            f"/api/transactions/{txn_id}",
            json={"category": "Dining"}
        )

        assert response.status_code == 200
        # Verify invalidate was called
        mock_invalidate.assert_called_once_with(uid)

@pytest.mark.asyncio
@patch("backend.api.accounts.invalidate_analytics_cache")
async def test_account_delete_invalidates_cache(mock_invalidate, mock_db_session, override_dependencies):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        uid = "cache_test_user"
        acc_id = uuid.uuid4()

        # Mock Account
        acc = Account(
            id=acc_id,
            uid=uid,
            account_type="manual",
            account_name="Cash",
            balance=Decimal("50.00")
        )
        mock_db_session.query.return_value.filter.return_value.first.return_value = acc

        response = await client.delete(f"/api/accounts/{acc_id}")

        assert response.status_code == 200
        mock_invalidate.assert_called_once_with(uid)


