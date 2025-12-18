import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import Account, Transaction, AuditLog, SessionLocal
from backend.services.plaid import sync_transactions_cursor, fetch_accounts

logger = logging.getLogger(__name__)

def perform_background_sync(account_id: uuid.UUID, user_uid: str):
    """
    Background task to sync transactions using Plaid's cursor-based API.
    Handles its own DB session to ensure thread safety.
    """
    db = SessionLocal()
    try:
        _sync_logic(db, account_id, user_uid)
    except Exception as e:
        logger.exception(f"Background sync failed for account {account_id}: {e}")
        # Try to reset status to failed so it can be retried
        try:
            account = db.query(Account).get(account_id)
            if account:
                account.sync_status = "failed"
                db.commit()
        except:
            pass
    finally:
        db.close()

def _sync_logic(db: Session, account_id: uuid.UUID, user_uid: str):
    # Load the trigger account
    primary_account = db.query(Account).filter(Account.id == account_id).first()
    if not primary_account:
        logger.warning(f"Account {account_id} not found during background sync.")
        return

    # Load ALL accounts sharing this access token (Item)
    # This enables us to sync 5 accounts (Checking, Savings, Credit) in 1 API call
    if not primary_account.secret_ref:
        logger.error(f"Account {account_id} missing secret_ref.")
        primary_account.sync_status = "failed"
        db.commit()
        return

    item_accounts = db.query(Account).filter(
        Account.secret_ref == primary_account.secret_ref,
        Account.uid == user_uid
    ).all()
    
    # Lock them all
    for acc in item_accounts:
        acc.sync_status = "syncing"
    db.commit()

    try:
        if primary_account.account_type != "traditional":
            for acc in item_accounts: acc.sync_status = "success"
            db.commit()
            return

        access_token = primary_account.secret_ref
        # Use cursor from the primary account (assuming they stay in sync or we use one for the item)
        # Ideally, cursor is per ITEM. But we stored it on ACCOUNT.
        # We'll use the cursor from the primary account, and update ALL accounts with the new cursor.
        cursor = primary_account.plaid_next_cursor
        
        # 1. Fetch Plaid Data
        sync_result = sync_transactions_cursor(access_token, cursor=cursor)
        acct_result = fetch_accounts(access_token) # For balance + ID mapping

        # 2. Build Maps
        # Plaid Account ID -> DB Account
        plaid_id_to_db_account = {}
        for p_acct in acct_result:
            p_id = p_acct["account_id"]
            mask = p_acct["mask"]
            # Find matching DB account by mask
            match = next((a for a in item_accounts if a.account_number_masked == mask), None)
            if match:
                plaid_id_to_db_account[p_id] = match
                # Update balance while we are here
                if p_acct.get("balance_current"):
                    match.balance = Decimal(str(p_acct["balance_current"]))
                match.currency = p_acct.get("currency") or match.currency or "USD"

        # 3. Process Transactions
        added = sync_result["added"]
        modified = sync_result["modified"]
        removed = sync_result["removed"]
        next_cursor = sync_result["next_cursor"]
        has_more = sync_result["has_more"]

        synced_count = 0

        # Removes
        for item in removed:
             # We don't know which account it belonged to efficiently without a query
             # But we can query by external_id
             tx_id = item["transaction_id"]
             existing = db.query(Transaction).filter(
                 Transaction.external_id == tx_id,
                 Transaction.uid == user_uid
             ).first()
             if existing:
                 db.delete(existing)

        # Helper
        def _clean_raw(txn_dict: dict) -> dict:
            clean = {}
            for k, v in txn_dict.items():
                if isinstance(v, Decimal): clean[k] = float(v)
                elif isinstance(v, (datetime, datetime.date)): clean[k] = v.isoformat()
                else: clean[k] = v
            return clean

        # Adds / Modifies
        for txn in added + modified:
            plaid_acct_id = txn["account_id"]
            target_account = plaid_id_to_db_account.get(plaid_acct_id)
            
            if not target_account:
                # Transaction belongs to an account we haven't linked (e.g. user selected only Checking, not Savings)
                continue

            txn_ts = datetime.combine(txn["date"], datetime.min.time(), tzinfo=timezone.utc)
            
            existing = db.query(Transaction).filter(
                Transaction.external_id == txn["transaction_id"],
                Transaction.account_id == target_account.id
            ).first()

            if existing:
                existing.amount = txn["amount"]
                existing.merchant_name = txn["merchant_name"]
                existing.description = txn["name"]
                existing.category = txn["category"]
                existing.ts = txn_ts
                existing.raw_json = _clean_raw(txn)
            else:
                new_txn = Transaction(
                    uid=user_uid,
                    account_id=target_account.id,
                    ts=txn_ts,
                    amount=txn["amount"],
                    currency=txn["currency"] or target_account.currency or "USD",
                    category=txn["category"],
                    merchant_name=txn["merchant_name"],
                    description=txn["name"],
                    external_id=txn["transaction_id"],
                    is_manual=False,
                    archived=False,
                    raw_json=_clean_raw(txn)
                )
                db.add(new_txn)
            synced_count += 1

        # 4. Finalize
        for acc in item_accounts:
            acc.plaid_next_cursor = next_cursor
            acc.last_synced_at = datetime.now(timezone.utc)
            acc.sync_status = "success"
        
        db.commit()

        # Audit only if changes
        if synced_count > 0 or len(removed) > 0:
            audit = AuditLog(
                actor_uid=user_uid,
                target_uid=user_uid,
                action="account_sync_background",
                source="backend",
                metadata_json={
                    "item_accounts": [str(a.id) for a in item_accounts],
                    "added": len(added),
                    "modified": len(modified),
                    "removed": len(removed),
                    "has_more": has_more
                }
            )
            db.add(audit)
            db.commit()

    except Exception as e:
        logger.error(f"Sync logic failed: {e}")
        db.rollback()
        for acc in item_accounts:
            acc.sync_status = "failed"
        db.commit()
        raise e
