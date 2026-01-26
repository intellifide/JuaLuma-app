#!/usr/bin/env python3
"""
Core Purpose: Improve Web3 transaction display by adding transaction hashes as notes
and making merchant names more user-friendly.

Last Updated: 2026-01-24 02:30 CST
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models import SessionLocal
from backend.models.transaction import Transaction
from backend.models.account import Account


def improve_web3_transaction_display():
    """
    Update Web3 transactions to have:
    1. Full transaction hash stored in description field as a note
    2. More user-friendly merchant names
    """
    db = SessionLocal()
    
    try:
        # Find all Web3 accounts
        web3_accounts = db.query(Account).filter(
            Account.account_type == "web3"
        ).all()
        
        web3_account_ids = [acc.id for acc in web3_accounts]
        
        if not web3_account_ids:
            print("No Web3 accounts found.")
            return
        
        print(f"Found {len(web3_account_ids)} Web3 accounts")
        
        # Find all transactions for these accounts
        transactions = db.query(Transaction).filter(
            Transaction.account_id.in_(web3_account_ids)
        ).all()
        
        print(f"Found {len(transactions)} Web3 transactions to process")
        
        updated_count = 0
        for txn in transactions:
            needs_update = False
            
            # If external_id exists (transaction hash) and description doesn't contain it
            if txn.external_id:
                # Extract the actual hash (remove any suffix like :native, :token:0, etc.)
                tx_hash = txn.external_id.split(':')[0]
                
                # Check if description needs updating
                if not txn.description or tx_hash not in txn.description:
                    # Add transaction hash as a note
                    existing_desc = txn.description or ""
                    if existing_desc and not existing_desc.endswith('\n'):
                        existing_desc += '\n'
                    
                    txn.description = f"{existing_desc}Transaction Hash: {tx_hash}"
                    needs_update = True
                
                # Update merchant name if it's just a truncated hash
                if txn.merchant_name and len(txn.merchant_name) <= 10:
                    # Check if it looks like a truncated hash (alphanumeric)
                    if txn.merchant_name.replace('0x', '').isalnum():
                        # Get chain info from account
                        account = db.query(Account).filter(
                            Account.id == txn.account_id
                        ).first()
                        
                        if account:
                            chain_name = account.provider.capitalize()
                            # Determine transaction type from amount
                            if txn.amount > 0:
                                tx_type = "Received"
                            else:
                                tx_type = "Sent"
                            
                            txn.merchant_name = f"{chain_name} {tx_type}"
                            needs_update = True
            
            if needs_update:
                db.add(txn)
                updated_count += 1
                
                if updated_count % 100 == 0:
                    print(f"Processed {updated_count} transactions...")
        
        # Commit all changes
        db.commit()
        print(f"\n✅ Successfully updated {updated_count} Web3 transactions")
        print(f"   - Added transaction hashes to descriptions")
        print(f"   - Improved merchant name display")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    improve_web3_transaction_display()
