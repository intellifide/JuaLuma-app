
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid

from backend.main import app
from backend.models import Base, User, Subscription
from backend.utils import get_db

# Setup in-memory DB
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

app.dependency_overrides[get_db] = override_get_db

# Fix for SQLite UUID/JSONB compatibility
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.postgresql import BYTEA 

@compiles(UUID, 'sqlite')
def visit_uuid(element, compiler, **kw):
    return "CHAR(32)"

@compiles(JSONB, 'sqlite')
def visit_jsonb(element, compiler, **kw):
    return "JSON"

@compiles(BYTEA, 'sqlite')
def visit_bytea(element, compiler, **kw):
    return "BLOB"

from sqlalchemy import text

@pytest.fixture(scope="module")
def db_session():
    # Setup
    # Ensure audit schema for sqlite attached FIRST
    with engine.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS audit"))
        conn.commit()

    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_widget_submission_rate_limit(db_session):
    # 1. Setup Developer User
    dev_uid = str(uuid.uuid4())
    dev_user = User(uid=dev_uid, email="rate_limit@example.com", role="user")
    db_session.add(dev_user)
    # Require Pro for creation
    db_session.add(Subscription(uid=dev_uid, plan="pro", status="active"))
    db_session.commit()
    
    # Mock Auth
    from backend.middleware.auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: dev_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
    
        # 1.5 Register as Developer
        reg_payload = {"payout_method": {}, "payout_frequency": "monthly"}
        await client.post("/api/developers/", json=reg_payload)
        
        # Refresh to ensure relationship is loaded
        db_session.expire_all() 
        db_session.refresh(dev_user)

        # 2. Submit 5 widgets (allowed)
        for i in range(5):
            payload = {
                "name": f"Widget {i}",
                "description": "Test",
                "category": "productivity",
                "scopes": [],
                "preview_data": {}
            }
            response = await client.post("/api/widgets/", json=payload)
            assert response.status_code == 201
            
        # 3. Submit 6th widget (should fail)
        payload = {
            "name": "Widget 6",
            "description": "Should fail",
            "category": "productivity",
            "scopes": [],
            "preview_data": {}
        }
        response = await client.post("/api/widgets/", json=payload)
        assert response.status_code == 429
        assert "limit reached" in response.json()["detail"]
