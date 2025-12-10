import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid

from backend.main import app
from backend.models import Base, User, Subscription, Widget
from backend.utils import get_db

# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

from sqlalchemy.ext.compiler import compiles # noqa: E402
from sqlalchemy.dialects.postgresql import UUID # noqa: E402

@compiles(UUID, 'sqlite')
def visit_uuid(element, compiler, **kw):
    return "CHAR(32)"

from sqlalchemy.dialects.postgresql import JSONB # noqa: E402
@compiles(JSONB, 'sqlite')
def visit_jsonb(element, compiler, **kw):
    return "JSON"

from sqlalchemy.dialects.postgresql import BYTEA # noqa: E402
@compiles(BYTEA, 'sqlite')
def visit_bytea(element, compiler, **kw):
    return "BLOB"

from httpx import AsyncClient, ASGITransport # noqa: E402

app.dependency_overrides[get_db] = override_get_db

from sqlalchemy import text # noqa: E402

@pytest.fixture(scope="module")
def db():
    # Attach 'audit' schema for SQLite to support 'audit.audit_log'
    with engine.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS audit"))
        conn.commit()
        
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_marketplace_flow(db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup Users
        dev_uid = str(uuid.uuid4())
        pro_uid = str(uuid.uuid4())
        
        # Developer User
        dev_user = User(uid=dev_uid, email="dev@example.com", role="user")
        db.add(dev_user)
        # Give dev Pro subscription (required for creating widget and registering)
        db.add(Subscription(uid=dev_uid, plan="pro", status="active"))
        
        # Consumer User (Pro)
        pro_user = User(uid=pro_uid, email="pro@example.com", role="user")
        db.add(pro_user)
        db.add(Subscription(uid=pro_uid, plan="pro", status="active"))
        
        db.commit()

        # Mock Auth
        from backend.middleware.auth import get_current_user
        
        # 1.5 Register Developer via API
        app.dependency_overrides[get_current_user] = lambda: dev_user
        dev_payload = {
            "payout_method": {"type": "bank_transfer", "account": "test_account"},
            "payout_frequency": "monthly"
        }
        response = await client.post("/api/developers/", json=dev_payload)
        assert response.status_code == 201
        
        # Refresh user to load new developer relationship
        db.refresh(dev_user)

        # 2. Developer Submits Widget
        widget_payload = {
            "name": "Test Widget",
            "description": "A test widget",
            "category": "productivity",
            "scopes": ["read:account"],
            "preview_data": {"demo": True}
        }
        
        # Use create endpoint (TIER 4.4)
        response = await client.post("/api/widgets/", json=widget_payload)
        assert response.status_code == 201
        widget_data = response.json()
        widget_id = widget_data["id"]
        assert widget_data["status"] == "pending_review"

        # 2.5 Verify "My Widgets"
        response = await client.get("/api/widgets/mine")
        assert response.status_code == 200
        my_widgets = response.json()
        assert len(my_widgets) == 1
        assert my_widgets[0]["id"] == widget_data["id"]

        # 3. Approve Widget (Manual DB update)
        
        # 3. Approve Widget (Manual DB update)
        widget = db.query(Widget).filter(Widget.id == widget_id).first()
        widget.status = "approved"
        db.commit()
        
        # 4. Consumer Lists Widgets
        app.dependency_overrides[get_current_user] = lambda: pro_user
        
        response = await client.get("/api/widgets/")
        assert response.status_code == 200
        widgets = response.json()
        assert len(widgets) >= 1
        assert widgets[0]["id"] == widget_id
        
        # 5. Consumer Downloads Widget
        response = await client.post(f"/api/widgets/{widget_id}/download")
        assert response.status_code == 200
        manifest = response.json()
        assert manifest["id"] == widget_id
        
        # Check download count
        db.refresh(widget)
        assert widget.downloads == 1
        
        # 6. Consumer Rates Widget (TIER 4.8)
        rating_payload = {"rating": 5, "review": "Great widget!"}
        response = await client.post(f"/api/widgets/{widget_id}/rate", json=rating_payload)
        assert response.status_code == 200
        
        # Check rating
        db.refresh(widget)
        assert widget.rating_count == 1
        assert widget.rating_avg == 5.0
        
        # 7. Run Payout Calculation (TIER 4.10)
        
        # Manually create payout for test
        from backend.models import DeveloperPayout
        from datetime import date
        payout = DeveloperPayout(
            month=date.today().replace(day=1),
            dev_uid=dev_uid,
            gross_revenue=100.0,
            payout_status="pending"
        )
        db.add(payout)
        db.commit()
        
        app.dependency_overrides[get_current_user] = lambda: dev_user
        response = await client.get("/api/developers/payouts")
        assert response.status_code == 200
        payouts = response.json()
        assert len(payouts) == 1
        assert float(payouts[0]["gross_revenue"]) == 100.0

        print("Marketplace Flow Test Passed!")
