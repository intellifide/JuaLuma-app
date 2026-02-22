#!/usr/bin/env python3
# Core Purpose: Remove Trade category and replace with Investment
# Last Updated: 2026-01-24 08:00 CST
"""
Remove Trade category from all transactions.

This script updates all transactions with "Trade" category to "Investment" category,
as Trade was removed from the valid category list.
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings
from backend.models import Transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def remove_trade_category():
    """Replace Trade category with Investment."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Find all transactions with "Trade" category
        trade_transactions = db.query(Transaction).filter(
            Transaction.category == "Trade"
        ).all()
        
        logger.info(f"Found {len(trade_transactions)} transactions with 'Trade' category")
        
        if len(trade_transactions) == 0:
            logger.info("No transactions to update")
            return
        
        # Update all to "Investment"
        for txn in trade_transactions:
            logger.info(
                f"Updating transaction {txn.id}: "
                f"'{txn.merchant_name or txn.description}' "
                f"from 'Trade' to 'Investment'"
            )
            txn.category = "Investment"
        
        # Commit all changes
        db.commit()
        
        logger.info(f"\n=== Summary ===")
        logger.info(f"Updated {len(trade_transactions)} transactions from 'Trade' to 'Investment'")
        
    except Exception as e:
        logger.error(f"Error removing Trade category: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting Trade category removal...")
    remove_trade_category()
    logger.info("Done!")
