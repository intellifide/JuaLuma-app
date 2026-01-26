#!/usr/bin/env python3
# Core Purpose: Fix CEX transaction signs for buy/sell trades
# Last Updated: 2026-01-24 07:30 CST
"""
Fix CEX transaction signs for buy/sell trades.

This script corrects the sign of CEX transaction amounts based on their merchant_name:
- "buy trade" transactions should be negative (money out)
- "sell trade" transactions should be positive (money in)

Run this after the direction logic fix to correct existing database records.
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings
from backend.models import Transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_cex_transaction_signs():
    """Fix the signs of CEX buy/sell transactions."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Find all CEX transactions (those with "buy trade" or "sell trade" in description or merchant_name)
        cex_transactions = db.query(Transaction).filter(
            (Transaction.description.ilike('%buy trade%')) |
            (Transaction.description.ilike('%sell trade%')) |
            (Transaction.merchant_name.ilike('%buy%')) |
            (Transaction.merchant_name.ilike('%sell%'))
        ).all()
        
        logger.info(f"Found {len(cex_transactions)} CEX transactions to review")
        
        fixed_buy = 0
        fixed_sell = 0
        skipped = 0
        
        for txn in cex_transactions:
            # Check both merchant_name and description
            merchant_lower = (txn.merchant_name or "").lower()
            description_lower = (txn.description or "").lower()
            combined = f"{merchant_lower} {description_lower}"
            
            # Check if it's a buy trade
            if "buy" in combined:
                # Buy trades should be negative (money out)
                if txn.amount > 0:
                    logger.info(f"Fixing BUY transaction {txn.id}: {txn.description or txn.merchant_name} from +{txn.amount} to -{txn.amount} {txn.currency}")
                    txn.amount = -abs(txn.amount)
                    fixed_buy += 1
                else:
                    skipped += 1
                    
            # Check if it's a sell trade
            elif "sell" in combined:
                # Sell trades should be positive (money in)
                if txn.amount < 0:
                    logger.info(f"Fixing SELL transaction {txn.id}: {txn.description or txn.merchant_name} from {txn.amount} to +{abs(txn.amount)} {txn.currency}")
                    txn.amount = abs(txn.amount)
                    fixed_sell += 1
                else:
                    skipped += 1
        
        # Commit all changes
        db.commit()
        
        logger.info(f"\n=== Summary ===")
        logger.info(f"Fixed {fixed_buy} BUY transactions (made negative)")
        logger.info(f"Fixed {fixed_sell} SELL transactions (made positive)")
        logger.info(f"Skipped {skipped} transactions (already correct)")
        logger.info(f"Total processed: {len(cex_transactions)}")
        
    except Exception as e:
        logger.error(f"Error fixing transactions: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting CEX transaction sign fix...")
    fix_cex_transaction_signs()
    logger.info("Done!")
