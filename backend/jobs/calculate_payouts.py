"""
Job to calculate developer payouts based on widget engagement.
Run monthly.
"""

# 2025-12-11 17:23 CST - derive payouts from widget run events with KYC guard and audit trail
import logging
from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal

from backend.models import AuditLog, Developer, DeveloperPayout, SessionLocal, Widget

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Each widget "run" generates this amount of gross revenue for its developer
RATE_PER_RUN = Decimal("0.05")


def _aggregate_widget_run_revenue(session):
    """Aggregate widget run events into revenue per developer for the current month."""
    start_of_month = date.today().replace(day=1)
    month_floor = datetime.combine(start_of_month, datetime.min.time(), tzinfo=UTC)

    revenue_map: dict[str, dict[str, Decimal | int]] = defaultdict(
        lambda: {"amount": Decimal(0), "runs": 0}
    )

    run_events = (
        session.query(AuditLog)
        .filter(
            AuditLog.action == "widget_run",
            AuditLog.archived.is_(False),
            AuditLog.ts >= month_floor,
        )
        .all()
    )

    for event in run_events:
        metadata = event.metadata_json or {}
        widget_id = metadata.get("widget_id")
        dev_uid = metadata.get("developer_uid")

        # Fallback to DB lookup if developer id was not captured in the event
        if not dev_uid and widget_id:
            widget = session.query(Widget).filter(Widget.id == widget_id).first()
            dev_uid = widget.developer_uid if widget else None

        if not dev_uid:
            logger.warning(
                "Skipping widget_run event with no developer context: %s", metadata
            )
            continue

        revenue_map[dev_uid]["amount"] += RATE_PER_RUN
        revenue_map[dev_uid]["runs"] += 1

    return start_of_month, revenue_map


def _developer_kyc_status(session, dev_uid: str) -> str:
    """Retrieve developer KYC status from payout_method metadata (default unverified)."""
    developer = session.query(Developer).filter(Developer.uid == dev_uid).first()
    payout_method = developer.payout_method if developer else {}
    if isinstance(payout_method, dict):
        return payout_method.get("kyc_status", "unverified")
    return "unverified"


def calculate_payouts():
    session = SessionLocal()
    try:
        logger.info("Starting payout calculation from widget run events...")

        current_month, revenue_map = _aggregate_widget_run_revenue(session)
        logger.info("Found %d developers with run revenue.", len(revenue_map))

        for dev_uid, stats in revenue_map.items():
            kyc_status = _developer_kyc_status(session, dev_uid)
            if kyc_status != "verified":
                logger.info(
                    "Skipping payout for %s due to KYC status: %s", dev_uid, kyc_status
                )
                session.add(
                    AuditLog(
                        actor_uid="system",
                        target_uid=dev_uid,
                        action="payout_skipped_kyc",
                        source="backend",
                        metadata_json={
                            "month": str(current_month),
                            "kyc_status": kyc_status,
                            "runs": stats["runs"],
                            "amount": str(stats["amount"]),
                        },
                    )
                )
                continue

            # Check if payout already exists for this month
            existing = (
                session.query(DeveloperPayout)
                .filter(
                    DeveloperPayout.month == current_month,
                    DeveloperPayout.dev_uid == dev_uid,
                )
                .first()
            )

            if existing:
                logger.info(
                    "Updating payout for %s in %s to %s",
                    dev_uid,
                    current_month,
                    stats["amount"],
                )
                existing.gross_revenue = stats["amount"]
            else:
                payout = DeveloperPayout(
                    month=current_month,
                    dev_uid=dev_uid,
                    gross_revenue=stats["amount"],
                    payout_status="pending",
                )
                session.add(payout)

            session.add(
                AuditLog(
                    actor_uid="system",
                    target_uid=dev_uid,
                    action="calculate_payout",
                    source="backend",
                    metadata_json={
                        "month": str(current_month),
                        "runs": stats["runs"],
                        "amount": str(stats["amount"]),
                    },
                )
            )

        session.commit()
        logger.info("Payout calculation complete.")

    except Exception as e:
        logger.error(f"Error calculating payouts: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    calculate_payouts()
