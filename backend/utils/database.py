# Updated 2025-12-08 17:53 CST by ChatGPT
from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from backend.models import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Provide a database session for FastAPI dependencies.

    Ensures connections are closed and failed connections surface as 500s.
    """
    try:
        db = SessionLocal()
    except OperationalError as exc:  # database unreachable
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed.",
        ) from exc

    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
