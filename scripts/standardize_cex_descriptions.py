#!/usr/bin/env python3
# Core Purpose: Standardize CEX transaction descriptions to be more descriptive
# Last Updated: 2026-01-24 07:45 CST
"""
Standardize CEX transaction descriptions.

This script updates transactions with simple "buy trade" or "sell trade" descriptions
to have more descriptive merchant_name like "SYMBOL BUY/SELL amount @ price".

For transactions without detailed trading info in raw data, it creates a basic
descriptive format like "CURRENCY BUY/SELL".
"""
import sys
from pathlib import Path
import json

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


def standardize_cex_descriptions():
    """Standardize CEX transaction descriptions."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Find all transactions with simple "buy trade" or "sell trade" descriptions
        # and empty or missing merchant_name
        simple_trades = db.query(Transaction).filter(
            (Transaction.description.ilike('%buy trade%')) |
            (Transaction.description.ilike('%sell trade%'))
        ).filter(
            (Transaction.merchant_name.is_(None)) |
            (Transaction.merchant_name == '')
        ).all()
        
        logger.info(f"Found {len(simple_trades)} transactions with simple descriptions to update")
        
        updated = 0
        skipped = 0
        
        for txn in simple_trades:
            description_lower = (txn.description or "").lower()
            
            # Determine if it's a buy or sell
            if "buy" in description_lower:
                side = "BUY"
            elif "sell" in description_lower:
                side = "SELL"
            else:
                skipped += 1
                continue
            
            # Try to extract details from raw data if available
            raw_data = txn.raw if hasattr(txn, 'raw') and txn.raw else {}
            
            # Build descriptive merchant_name
            currency = txn.currency or "USD"
            amount_abs = abs(txn.amount)
            
            # Try to get trading pair and details from raw data
            symbol = None
            trade_amount = None
            price = None
            
            if isinstance(raw_data, dict):
                symbol = raw_data.get("symbol")
                trade_amount = raw_data.get("amount")
                price = raw_data.get("price")
            
            # Build the descriptive name
            if symbol and trade_amount and price:
                # Full descriptive format: "BTC/USD BUY 0.5 @ $45,000"
                merchant_name = f"{symbol} {side} {trade_amount:.8f} @ ${price:,.2f}"
            elif symbol:
                # Basic format with symbol: "BTC/USD BUY"
                merchant_name = f"{symbol} {side}"
            else:
                # Fallback format: "USD BUY" or "USDC SELL"
                merchant_name = f"{currency} {side}"
            
            # Update the transaction
            old_name = txn.merchant_name or "(empty)"
            txn.merchant_name = merchant_name
            txn.description = merchant_name  # Also update description for consistency
            
            logger.info(
                f"Updated transaction {txn.id}: "
                f"'{old_name}' -> '{merchant_name}' "
                f"(Amount: {txn.amount} {currency})"
            )
            updated += 1
        
        # Commit all changes
        db.commit()
        
        logger.info(f"\n=== Summary ===")
        logger.info(f"Updated {updated} transactions with descriptive names")
        logger.info(f"Skipped {skipped} transactions")
        logger.info(f"Total processed: {len(simple_trades)}")
        
    except Exception as e:
        logger.error(f"Error standardizing descriptions: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting CEX transaction description standardization...")
    standardize_cex_descriptions()
    logger.info("Done!")
