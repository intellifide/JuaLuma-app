from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.middleware.auth import get_current_user
from backend.models import Account, Transaction, User
from backend.utils import get_db

# Mock User
mock_user = User(uid="test_user_123", email="test@example.com", role="user")


# Mock Dependencies
def override_get_current_user():
    return mock_user


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


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
    yield
    app.dependency_overrides = {}


# Tests


@pytest.mark.asyncio
@patch("backend.services.analytics.get_firestore_client")
async def test_net_worth_endpoint(
    mock_fs, client, mock_db_session, override_dependencies
):
    # Setup Mock Firestore (empty cache)
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_col = MagicMock()
    mock_col.document.return_value.get.return_value = mock_doc
    mock_fs.return_value.collection.return_value = mock_col

    # Setup Mock DB Data
    # Accounts
    acc1 = Account(uid="test_user_123", balance=Decimal("5000.00"))
    acc2 = Account(uid="test_user_123", balance=Decimal("1000.00"))

    # Transactions (newest first)
    # Today is effectively "End Date" for the query usually
    t1 = Transaction(
        uid="test_user_123",
        amount=Decimal("-100.00"),
        ts=datetime.now(UTC) - timedelta(days=1),
    )
    t2 = Transaction(
        uid="test_user_123",
        amount=Decimal("2000.00"),
        ts=datetime.now(UTC) - timedelta(days=5),
    )

    def query_side_effect(model):
        m = MagicMock()
        if model == Account:
            m.filter.return_value.all.return_value = [acc1, acc2]  # Total 6000
        elif model == Transaction:
            m.filter.return_value.order_by.return_value.all.return_value = [t1, t2]
            m.filter.return_value.all.return_value = []  # For the "recent_txns" query (future txns)
        return m

    mock_db_session.query.side_effect = query_side_effect

    # Make Request
    response = await client.get(
        "/api/analytics/net-worth",
        params={
            "start_date": (date.today() - timedelta(days=7)).isoformat(),
            "end_date": date.today().isoformat(),
            "interval": "daily",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0
    # Current balance should be 6000
    # Latest point
    assert data["data"][-1]["value"] == 6000.0


@pytest.mark.asyncio
async def test_cash_flow_endpoint(client, mock_db_session, override_dependencies):
    # Mock ResultProxy
    row_income = MagicMock()
    row_income.period = datetime(2023, 1, 1)
    row_income.total = Decimal("5000")

    row_expense = MagicMock()
    row_expense.period = datetime(2023, 1, 1)
    row_expense.total = Decimal("-2000")

    mock_result_income = MagicMock()
    mock_result_income.all.return_value = [row_income]

    mock_result_expense = MagicMock()
    mock_result_expense.all.return_value = [row_expense]

    mock_db_session.execute.side_effect = [mock_result_income, mock_result_expense]

    response = await client.get(
        "/api/analytics/cash-flow",
        params={"start_date": "2023-01-01", "end_date": "2023-01-31"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["income"]) == 1
    assert data["income"][0]["value"] == 5000.0
    assert len(data["expenses"]) == 1
    assert data["expenses"][0]["value"] == -2000.0


@pytest.mark.asyncio
async def test_spending_by_category_endpoint(
    client, mock_db_session, override_dependencies
):
    # Mock row
    row1 = MagicMock()
    row1.category = "Food"
    row1.total = Decimal("-500")

    row2 = MagicMock()
    row2.category = "Rent"
    row2.total = Decimal("-1500")

    mock_res = MagicMock()
    mock_res.all.return_value = [row1, row2]
    mock_db_session.execute.return_value = mock_res

    response = await client.get(
        "/api/analytics/spending-by-category",
        params={"start_date": "2023-01-01", "end_date": "2023-01-31"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 2
    # Should be positive and sorted desc
    assert data["data"][0]["category"] == "Rent"
    assert data["data"][0]["amount"] == 1500.0

@pytest.mark.asyncio
@patch("backend.services.analytics.get_firestore_client")
async def test_net_worth_flat_line_repro(mock_fs, client, mock_db_session, override_dependencies):
    # Setup Mock Firestore (empty cache)
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_col = MagicMock()
    mock_col.document.return_value.get.return_value = mock_doc
    mock_fs.return_value.collection.return_value = mock_col

    # Scenario: Account has 1000 balance. No transactions in last 30 days.
    acc = Account(uid="test_user_123", balance=Decimal("1000.00"))

    # Mock DB Queries
    def query_side_effect(model):
        m = MagicMock()
        if model == Account:
            m.filter.return_value.all.return_value = [acc]
        elif model == Transaction:
            # No transactions in range
            m.filter.return_value.order_by.return_value.all.return_value = []
            # No future transactions
            m.filter.return_value.all.return_value = []
        return m

    mock_db_session.query.side_effect = query_side_effect

    start_date = date.today() - timedelta(days=30)
    end_date = date.today()
    
    response = await client.get(
        "/api/analytics/net-worth",
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "interval": "daily",
        },
    )

    assert response.status_code == 200
    data = response.json()
    points = data["data"]
    
    assert len(points) >= 30
    # All points should be 1000
    for p in points:
        assert p["value"] == 1000.0, f"Point {p['date']} has value {p['value']}, expected 1000.0"

@pytest.mark.asyncio
@patch("backend.services.analytics.get_firestore_client")
async def test_net_worth_one_transaction(mock_fs, client, mock_db_session, override_dependencies):
    # Setup Mock Firestore (empty cache)
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_col = MagicMock()
    mock_col.document.return_value.get.return_value = mock_doc
    mock_fs.return_value.collection.return_value = mock_col

    # Scenario: Account has 1000 balance currently.
    # One transaction of -100 yesterday (so balance was 1100 before that).
    acc = Account(uid="test_user_123", balance=Decimal("1000.00"))
    
    yesterday = datetime.now(UTC) - timedelta(days=1)
    t1 = Transaction(uid="test_user_123", amount=Decimal("-100.00"), ts=yesterday)

    # Mock DB Queries
    def query_side_effect_smart(model):
        m = MagicMock()
        
        if model == Account:
            # accounts query
            m.filter.return_value.all.return_value = [acc]
        elif model == Transaction:
            # We need to distinguish between "future txns" and "range txns"
            
            filter_mock = MagicMock()
            m.filter.return_value = filter_mock
            
            # Future txns
            filter_mock.all.return_value = [] 
            
            # Range txns
            order_by_mock = MagicMock()
            filter_mock.order_by.return_value = order_by_mock
            order_by_mock.all.return_value = [t1]
            
        return m

    mock_db_session.query.side_effect = query_side_effect_smart

    start_date = date.today() - timedelta(days=30)
    end_date = date.today()
    
    response = await client.get(
        "/api/analytics/net-worth",
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "interval": "daily",
        },
    )

    assert response.status_code == 200
    data = response.json()
    points = data["data"]
    
    # Mapping dates:
    today_str = date.today().isoformat()
    yst_str = (date.today() - timedelta(days=1)).isoformat()
    day_before_str = (date.today() - timedelta(days=2)).isoformat()
    
    val_map = {d['date']: d['value'] for d in points}
    
    assert val_map[today_str] == 1000.0
    assert val_map[yst_str] == 1000.0
    assert val_map[day_before_str] == 1100.0
