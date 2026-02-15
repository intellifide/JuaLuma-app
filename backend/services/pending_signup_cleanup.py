"""Cleanup helpers for pending signup records."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from backend.models import PendingSignup


def cleanup_stale_pending_signups(db: Session, *, hours: int = 24) -> int:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    stale = db.query(PendingSignup).filter(PendingSignup.created_at < cutoff).all()
    for entry in stale:
        db.delete(entry)
    db.commit()
    return len(stale)
