"""Cleanup stale pending signup records older than 24 hours."""

from datetime import UTC, datetime, timedelta

from backend.models import PendingSignup, SessionLocal


def cleanup(hours: int = 24) -> int:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    db = SessionLocal()
    try:
        stale = (
            db.query(PendingSignup)
            .filter(PendingSignup.created_at < cutoff)
            .all()
        )
        for entry in stale:
            db.delete(entry)
        db.commit()
        return len(stale)
    finally:
        db.close()


if __name__ == "__main__":
    removed = cleanup()
    print(f"Removed {removed} stale pending signup(s).")
