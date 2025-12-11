"""SQLAlchemy base configuration for Finity backend.

Updated 2025-12-11 01:28 CST by ChatGPT
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import settings

DATABASE_URL = settings.database_url

engine_kwargs = {
    "pool_size": 5,
    "max_overflow": 10,
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
