#!/usr/bin/env python3
"""
Fix account balances for existing manual transactions.
This script recalculates account balances by summing all non-archived manual transactions.

Run: python scripts/fix_manual_transaction_balances.py
"""

# Updated 2026-01-25 01:35 CST

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from backend.models import SessionLocal, Account, Transaction

def fix_manual_transaction_balances():
    db = SessionLocal()
    try:
        # Find all manual accounts
        manual_accounts = db.query(Account).filter(Account.account_type == "manual").all()
        
        print(f"Found {len(manual_accounts)} manual accounts")
        
        for account in manual_accounts:
            # Sum all non-archived transactions for this account
            transactions = (
                db.query(Transaction)
                .filter(
                    Transaction.account_id == account.id,
                    Transaction.archived.is_(False),
                )
                .all()
            )
            
            total = sum((t.amount or Decimal(0)) for t in transactions)
            old_balance = account.balance or Decimal(0)
            
            if old_balance != total:
                print(f"Account {account.id} ({account.account_name}): {old_balance} -> {total} (delta: {total - old_balance})")
                account.balance = total
            else:
                print(f"Account {account.id} ({account.account_name}): balance correct at {total}")
        
        db.commit()
        print("\n✅ Account balances fixed!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_manual_transaction_balances()
