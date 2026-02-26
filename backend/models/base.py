"""SQLAlchemy base configuration for jualuma backend.

Updated 2025-12-11 01:28 CST by ChatGPT
"""

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import settings

DATABASE_URL = settings.database_url

engine_kwargs: dict[str, Any] = {
    "pool_size": settings.db_pool_size,
    "max_overflow": settings.db_max_overflow,
    "pool_timeout": settings.db_pool_timeout_seconds,
    "pool_recycle": settings.db_pool_recycle_seconds,
    "pool_pre_ping": settings.db_pool_pre_ping,
    "pool_use_lifo": True,
    "future": True,
}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update(
        {
            "connect_args": {"check_same_thread": False},
            "poolclass": StaticPool,
        }
    )
    engine_kwargs.pop("pool_size", None)
    engine_kwargs.pop("max_overflow", None)
    engine_kwargs.pop("pool_timeout", None)
    engine_kwargs.pop("pool_recycle", None)
    engine_kwargs.pop("pool_pre_ping", None)
    engine_kwargs.pop("pool_use_lifo", None)

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_session() -> Generator:
    """Yield a database session and ensure it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
