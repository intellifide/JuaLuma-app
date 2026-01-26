#!/usr/bin/env python3
"""
Core Purpose: Clean Web3 transaction descriptions by removing truncated hash prefixes.
Only keeps the "Transaction Hash: xxx" line.

Last Updated: 2026-01-24 03:00 CST
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import SessionLocal
from backend.models.transaction import Transaction
from backend.models.account import Account


def clean_web3_descriptions():
    """
    Clean Web3 transaction descriptions by removing truncated hash prefixes.
    Only keeps the "Transaction Hash: xxx" line for clean display.
    """
    db = SessionLocal()
    
    try:
        # Get Web3 accounts
        web3_accounts = db.query(Account).filter(Account.account_type == "web3").all()
        
        if not web3_accounts:
            print("No Web3 accounts found.")
            return
        
        print(f"Found {len(web3_accounts)} Web3 accounts")
        
        web3_account_ids = [acc.id for acc in web3_accounts]
        transactions = db.query(Transaction).filter(
            Transaction.account_id.in_(web3_account_ids)
        ).all()
        
        print(f"Processing {len(transactions)} Web3 transactions...")
        
        updated = 0
        for txn in transactions:
            if txn.description and "Transaction Hash:" in txn.description:
                # Remove the truncated hash prefix
                lines = txn.description.split('\n')
                
                # Keep only lines that contain "Transaction Hash:"
                clean_lines = [line for line in lines if 'Transaction Hash:' in line]
                
                if clean_lines and clean_lines[0] != txn.description:
                    txn.description = clean_lines[0]
                    db.add(txn)
                    updated += 1
        
        db.commit()
        print(f"\n✅ Successfully cleaned {updated} transaction descriptions")
        
        # Show sample
        if transactions:
            print("\nSample cleaned descriptions:")
            for txn in transactions[:3]:
                print(f"  - {txn.merchant_name}")
                print(f"    {txn.description[:80]}...")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    clean_web3_descriptions()
