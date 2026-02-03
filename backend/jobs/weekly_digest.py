"""Deprecated: Use digest settings runner.

This module remains for backward compatibility with older cron configurations.
It now runs the generalized digest scheduler (cadence + time configured per user).
"""

# Last Updated: 2026-02-03 00:00 CST

from datetime import UTC, datetime
import logging

from backend.models import SessionLocal
from backend.services.digests import run_due_digests

logger = logging.getLogger(__name__)


def run_weekly_digest() -> None:
    now = datetime.now(UTC)
    db = SessionLocal()
    try:
        sent = run_due_digests(db, now_utc=now)
        logger.info("Digest runner completed; sent %s digest(s).", sent)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_weekly_digest()
