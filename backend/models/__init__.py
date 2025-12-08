"""
SQLAlchemy base configuration for Finity backend.

Sets up the declarative Base, engine, and session factory for the rest of the
models. Uses DATABASE_URL from the environment.
"""

# Updated 2025-12-08 17:37 CST by ChatGPT

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the environment.")

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_session() -> Generator:
    """Provide a transactional session scope."""
    with SessionLocal() as session:
        yield session


from .account import Account
from .developer import Developer
from .subscription import Subscription
from .user import User

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_session",
    "User",
    "Developer",
    "Subscription",
    "Account",
]
