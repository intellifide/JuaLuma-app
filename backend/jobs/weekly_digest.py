"""Send weekly digest notifications to all users."""

# Last Updated: 2026-02-03 00:00 CST

from datetime import UTC, datetime
import logging

from backend.models import SessionLocal, User
from backend.services.notification_triggers import send_weekly_digest

logger = logging.getLogger(__name__)


def _should_send_digest(user: User, now_utc: datetime) -> bool:
    try:
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(user.time_zone or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")

    local_now = now_utc.astimezone(tz)
    if local_now.hour != 10:
        return False

    if not user.weekly_digest_sent_at:
        return True

    last_local = user.weekly_digest_sent_at.astimezone(tz)
    return last_local.date() < local_now.date()


def run_weekly_digest() -> None:
    now = datetime.now(UTC)
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            if not _should_send_digest(user, now):
                continue
            send_weekly_digest(db, user.uid, now=now)
            user.weekly_digest_sent_at = now
            db.add(user)
        db.commit()
        logger.info("Weekly digest completed for %s users.", len(users))
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_weekly_digest()
