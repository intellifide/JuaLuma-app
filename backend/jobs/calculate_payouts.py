"""
Job to calculate developer payouts based on widget engagement.
Run monthly.
"""
import logging
from datetime import date
from decimal import Decimal
from collections import defaultdict


from backend.models import Widget, DeveloperPayout, AuditLog
from backend.models import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RATE_PER_DOWNLOAD = Decimal("0.10")
RATE_PER_RATING = Decimal("0.50")

def calculate_payouts():
    session = SessionLocal()
    try:
        logger.info("Starting payout calculation...")
        
        # 1. Aggregate revenue by developer (Mocking engagement from total stats)
        # In a real system, we'd query `widget_engagement` filtering by date range.
        widgets = session.query(Widget).all()
        revenue_map = defaultdict(Decimal)
        
        for w in widgets:
            # Simple revenue model
            rev = (Decimal(w.downloads) * RATE_PER_DOWNLOAD) + \
                  (Decimal(w.rating_count) * RATE_PER_RATING)
            if rev > 0:
                revenue_map[w.developer_uid] += rev
        
        logger.info(f"Found {len(revenue_map)} developers with revenue.")
        
        current_month = date.today().replace(day=1)
        
        for dev_uid, amount in revenue_map.items():
            # Check if payout already exists for this month
            existing = session.query(DeveloperPayout).filter(
                DeveloperPayout.month == current_month,
                DeveloperPayout.dev_uid == dev_uid
            ).first()
            
            if existing:
                logger.info(f"Payout for {dev_uid} in {current_month} already exists. Updating.")
                # We update the amount - naive approach assuming re-run updates 'current' provisional total
                existing.gross_revenue = amount
                # existing.updated_at = now() - auto handled
            else:
                layout = DeveloperPayout(
                    month=current_month,
                    dev_uid=dev_uid,
                    gross_revenue=amount,
                    payout_status="pending"
                )
                session.add(layout)
                
                # Audit
                audit = AuditLog(
                    actor_uid="system",
                    target_uid=str(layout.id) if layout.id else dev_uid, # ID not gen yet?
                    action="calculate_payout",
                    source="backend_job",
                    metadata_json={"month": str(current_month), "amount": str(amount)}
                )
                session.add(audit)
        
        session.commit()
        logger.info("Payout calculation complete.")
        
    except Exception as e:
        logger.error(f"Error calculating payouts: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    calculate_payouts()
