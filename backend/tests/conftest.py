
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.utils import get_db
from backend.models import Base
from backend.middleware.auth import get_current_user
from backend.models import User

# Use in-memory SQLite for testing to avoid touching real DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db() -> Generator:
    """
    Creates a fresh database for each test function.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_client(test_db) -> Generator:
    """
    FastAPI TestClient with overridden database dependency.
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def mock_auth(test_db):
    """
    Bypasses Firebase auth and returns a test user.
    """
    user = User(
        uid="test_user_123",
        email="test@example.com",
        role="user",
        full_name="Test User",
        is_active=True,
        # Default empty preferences
        theme_pref="light",
        currency_pref="USD"
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    def override_get_current_user():
        return user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    return user
