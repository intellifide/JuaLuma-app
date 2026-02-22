# Core Purpose: Seed recurring transactions for Julia and Mark to simulate subscriptions and bills.
# Author: Antigravity
# Last Modified: 2026-02-02 19:50 CST/19:47 Local

import os
import sys
from decimal import Decimal
from datetime import datetime, timedelta, UTC
import random

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.models import (
    SessionLocal, User, Account, Transaction
)

JULIA_UID = "so2BKS6XymVult8VzjsHjg8mdVgX"
MARK_UID = "mark_luma_uid_marketing"

JULIA_RECURRING = [
    {"desc": "Mortgage AutoPay - Chase", "amount": 3200.00, "cat": "Housing"},
    {"desc": "Verizon Wireless", "amount": 185.50, "cat": "Utilities"},
    {"desc": "PG&E Utility", "amount": 245.00, "cat": "Utilities"},
    {"desc": "Netflix.com", "amount": 19.99, "cat": "Entertainment"},
    {"desc": "Peloton Subscription", "amount": 44.00, "cat": "Health"},
]

MARK_RECURRING = [
    {"desc": "Tesla Finance - Car Note", "amount": 850.00, "cat": "Auto"},
    {"desc": "Geico Insurance", "amount": 210.00, "cat": "Auto"},
    {"desc": "Adobe Creative Cloud", "amount": 54.99, "cat": "Shopping"},
    {"desc": "GitHub Pro", "amount": 19.00, "cat": "Entertainment"},
    {"desc": "YouTube Premium", "amount": 13.99, "cat": "Entertainment"},
]

def seed_recurring_patterns():
    db = SessionLocal()
    try:
        # 1. Find Accounts
        julia_acc = db.query(Account).filter(Account.account_name == "Sapphire Checking").first()
        mark_acc = db.query(Account).filter(Account.account_name == "Personal Savings").first()
        
        if not julia_acc or not mark_acc:
            print("❌ Error: Could not find target accounts (Sapphire Checking or Personal Savings).")
            return

        print(f"🔄 Seeding Recurring Patterns...")
        
        # We'll create 6 months of historical transactions for each
        # to ensure the detection algorithm picks them up (min_occurrences is 3)
        today = datetime.now(UTC).replace(hour=10, minute=0, second=0, microsecond=0)
        
        txn_count = 0

        # Process Julia
        for item in JULIA_RECURRING:
            # We seed on roughly the same day of each month (e.g. the 5th)
            day_of_month = random.randint(1, 28)
            for i in range(1, 7): # Last 6 months
                txn_date = today - timedelta(days=i*30)
                # Adjust to the same day of month for consistency
                # (Simple approximation: replace day)
                try:
                    txn_date = txn_date.replace(day=day_of_month)
                except ValueError:
                    txn_date = txn_date.replace(day=28)
                
                txn = Transaction(
                    uid=JULIA_UID,
                    account_id=julia_acc.id,
                    ts=txn_date,
                    amount=Decimal(str(-item["amount"])),
                    description=item["desc"],
                    merchant_name=item["desc"].split(" - ")[0],
                    category=item["cat"],
                    is_manual=False
                )
                db.add(txn)
                txn_count += 1
            print(f"   ✅ Seeded Monthly: {item['desc']} for Julia")

        # Process Mark
        for item in MARK_RECURRING:
            day_of_month = random.randint(1, 28)
            for i in range(1, 7):
                txn_date = today - timedelta(days=i*30)
                try:
                    txn_date = txn_date.replace(day=day_of_month)
                except ValueError:
                    txn_date = txn_date.replace(day=28)

                txn = Transaction(
                    uid=JULIA_UID, # Julia is the dashboard owner for marketing
                    account_id=mark_acc.id,
                    ts=txn_date,
                    amount=Decimal(str(-item["amount"])),
                    description=item["desc"],
                    merchant_name=item["desc"].split(" - ")[0],
                    category=item["cat"],
                    is_manual=False
                )
                db.add(txn)
                txn_count += 1
            print(f"   ✅ Seeded Monthly: {item['desc']} for Mark")

        db.commit()
        print(f"\n✨ SUCCESS: Seeded {txn_count} historical transactions to establish recurring patterns.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during recurring seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_recurring_patterns()
