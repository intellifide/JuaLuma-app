#!/usr/bin/env python3
"""
Core Purpose: Fix merchant names for Web3 transactions that are None or truncated hashes.

Last Updated: 2026-01-24 02:45 CST
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import SessionLocal
from backend.models.transaction import Transaction
from backend.models.account import Account


def fix_web3_merchant_names():
    """
    Update Web3 transaction merchant names to be user-friendly.
    Replaces None or truncated hashes with descriptive names like "Ethereum Received".
    """
    db = SessionLocal()
    
    try:
        # Get Web3 accounts
        web3_accounts = db.query(Account).filter(Account.account_type == "web3").all()
        account_map = {acc.id: acc for acc in web3_accounts}
        
        if not web3_accounts:
            print("No Web3 accounts found.")
            return
        
        print(f"Found {len(web3_accounts)} Web3 accounts")
        
        # Get Web3 transactions with None or truncated merchant names
        web3_account_ids = [acc.id for acc in web3_accounts]
        transactions = db.query(Transaction).filter(
            Transaction.account_id.in_(web3_account_ids)
        ).all()
        
        print(f"Processing {len(transactions)} Web3 transactions...")
        
        updated = 0
        for txn in transactions:
            needs_update = False
            
            # Fix merchant name if it's None or looks like a truncated hash
            if not txn.merchant_name or (len(txn.merchant_name) <= 10 and txn.merchant_name.replace('0x', '').isalnum()):
                account = account_map.get(txn.account_id)
                if account:
                    chain_name = account.provider.capitalize()
                    
                    # Determine direction from amount
                    if txn.amount > 0:
                        tx_type = "Received"
                    elif txn.amount < 0:
                        tx_type = "Sent"
                    else:
                        tx_type = "Transfer"
                    
                    txn.merchant_name = f"{chain_name} {tx_type}"
                    needs_update = True
            
            if needs_update:
                db.add(txn)
                updated += 1
                
                if updated % 100 == 0:
                    print(f"Processed {updated} transactions...")
        
        db.commit()
        print(f"\n✅ Successfully updated {updated} transaction merchant names")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_web3_merchant_names()
