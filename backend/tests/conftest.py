# CORE PURPOSE: Pytest configuration and shared fixtures for backend tests.
# LAST MODIFIED: 2026-01-18 23:30 CST

import os
from collections.abc import Generator

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Updated 2025-12-11 01:45 CST by ChatGPT
# Provide safe defaults so settings validation passes during tests.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("PLAID_CLIENT_ID", "test-client")
os.environ.setdefault("PLAID_SECRET", "test-secret")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5175")
os.environ.setdefault("RATE_LIMIT_MAX_REQUESTS", "100")
os.environ.setdefault("RATE_LIMIT_WINDOW_SECONDS", "60")

# Monkeypatch httpx.Client to ignore 'app' argument passed by older starlette versions
_orig_client_init = httpx.Client.__init__


def _new_client_init(self, *args, **kwargs):
    if "app" in kwargs:
        kwargs.pop("app")
    _orig_client_init(self, *args, **kwargs)


httpx.Client.__init__ = _new_client_init

from sqlalchemy.dialects.postgresql import BYTEA, JSONB, UUID  # noqa: E402

# Use in-memory SQLite for testing to avoid touching real DB
from sqlalchemy.ext.compiler import compiles  # noqa: E402

from backend.main import app  # noqa: E402
from backend.middleware.auth import get_current_user  # noqa: E402
from backend.models import (  # noqa: E402
    Base,
    User,
)
from backend.utils import get_db  # noqa: E402


@compiles(UUID, "sqlite")
def compile_uuid(type_, compiler, **kw):
    return "CHAR(36)"


# Monkeypatch UUID bind_processor to handle strings in SQLite
original_bind_processor = UUID.bind_processor


def safe_bind_processor(self, dialect):
    if dialect.name == "sqlite":

        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value
            return str(value)

        return process
    return original_bind_processor(self, dialect)


UUID.bind_processor = safe_bind_processor


@compiles(JSONB, "sqlite")
def compile_jsonb(type_, compiler, **kw):
    return "TEXT"


@compiles(BYTEA, "sqlite")
def compile_bytea(type_, compiler, **kw):
    return "BLOB"


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

from sqlalchemy import event  # noqa: E402


@event.listens_for(engine, "connect")
def do_connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("ATTACH DATABASE ':memory:' AS audit")
    cursor.close()


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
        # Default empty preferences
        theme_pref="light",
        currency_pref="USD",
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    def override_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = override_get_current_user
    return user
