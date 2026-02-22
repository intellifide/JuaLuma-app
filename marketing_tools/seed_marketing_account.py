# Core Purpose: Generate 1 year of high-fidelity transaction data and AI history.
# Author: Antigravity
# Last Modified: 2026-02-02 19:25 CST

import os
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.models import Account, LLMLog, SessionLocal, Transaction, User
from backend.utils.encryption import encrypt_prompt

EMAIL = "marketing-ultimate-showcase@testmail.app"
UID = "so2BKS6XymVult8VzjsHjg8mdVgX"

CATEGORIES = {
    "Dining": ["Starbucks", "Sweetgreen", "Blue Bottle Coffee", "Nobu", "Chipotle", "Uber Eats"],
    "Groceries": ["Whole Foods", "Trader Joe's", "Erewhon", "Safeway"],
    "Travel": ["Delta Air Lines", "Airbnb", "Uber", "Lyft", "Marriott", "Hyatt"],
    "Entertainment": ["Netflix", "Spotify", "Apple Services", "AMC Theatres", "Ticketmaster"],
    "Auto": ["Tesla Supercharger", "Chevron", "Shell", "Bridge Toll"],
    "Shopping": ["Amazon", "Apple Store", "Nike", "Nordstrom", "Lululemon"],
    "Utilities": ["PG&E", "Comcast", "Verizon", "Water Dept"],
    "Health": ["Equinox", "CVS Pharmacy", "SoulCycle", "Therapy"],
}

INCOME_SOURCES = ["Jualuma Inc Salary", "Vanguard Dividends", "Rent Income"]

def generate_data():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.uid == UID).first()
        if not user:
            print("❌ Error: User not found. Please run initial setup first.")
            return

        # 1. Get Accounts
        accounts = db.query(Account).filter(Account.uid == UID).all()
        if not accounts:
            print("❌ Error: Accounts not found.")
            return

        main_acc = next((a for a in accounts if "Checking" in a.account_name), accounts[0])

        # 2. Clear existing transactions for fresh start
        db.query(Transaction).filter(Transaction.uid == UID).delete()
        print("🧹 Cleared old transactions.")

        # 3. Generate 365 days of data
        start_date = datetime.utcnow() - timedelta(days=365)
        tx_count = 0

        for i in range(366):
            current_date = start_date + timedelta(days=i)

            # Monthly Income
            if current_date.day == 1:
                tx = Transaction(
                    uid=UID, account_id=main_acc.id, ts=current_date.replace(hour=9),
                    amount=Decimal("8500.00"), description="Jualuma Inc Salary",
                    category="Income"
                )
                db.add(tx)
                tx_count += 1

            if current_date.day == 15:
                tx = Transaction(
                    uid=UID, account_id=main_acc.id, ts=current_date.replace(hour=10),
                    amount=Decimal("1200.00"), description="Vanguard Dividends",
                    category="Income"
                )
                db.add(tx)
                tx_count += 1

            # Daily small transactions (0-3 per day)
            num_tx = random.choices([0, 1, 2, 3, 4], weights=[10, 30, 30, 20, 10])[0]
            for _j in range(num_tx):
                cat = random.choice(list(CATEGORIES.keys()))
                merchant = random.choice(CATEGORIES[cat])

                # Dynamic pricing
                if cat == "Travel" and "Air" in merchant:
                    amount = Decimal(str(random.uniform(200, 800))).quantize(Decimal("0.01"))
                elif cat == "Dining":
                    amount = Decimal(str(random.uniform(5, 150))).quantize(Decimal("0.01"))
                else:
                    amount = Decimal(str(random.uniform(10, 200))).quantize(Decimal("0.01"))

                tx = Transaction(
                    uid=UID,
                    account_id=main_acc.id,
                    ts=current_date.replace(hour=random.randint(8, 20), minute=random.randint(0, 59)),
                    amount=-amount,
                    description=merchant,
                    category=cat,
                    merchant_name=merchant
                )
                db.add(tx)
                tx_count += 1

            if i % 50 == 0:
                db.flush() # Intermediate flush

        print(f"✅ Generated {tx_count} Transactions for 1 full year.")

        # 4. Generate Robust AI History
        db.query(LLMLog).filter(LLMLog.uid == UID).delete()

        ai_history = [
            ("What was my highest spending month in 2025?", "Based on your transaction history, November 2025 was your highest spending month ($7,840), primarily due to holiday travel and home utility spikes."),
            ("Analyze my subscription trends.", "You currently have 4 recurring entertainment subscriptions. Your annual spend here is $456. Switching to annual billing for Netflix could save you $40/year."),
            ("How does my dining spend compare to last quarter?", "Your dining spending has decreased by 15% this quarter ($1,200 vs $1,410). Most of the savings came from fewer Uber Eats orders."),
            ("Identify my largest recurring bill.", "Your largest recurring expense is your 'Marketplace Health' payment at $450/month, followed by your Jualuma Pro subscription."),
            ("Search for all transactions at 'Apple Store'.", "I found 3 transactions: $1,299 (iPhone 16) in Sept, $79 (Watch Band) in Dec, and $2.99 monthly for iCloud storage."),
            ("Am I on track for my $50k emergency fund goal?", "Yes! You have contributed $2,500 monthly from your Jualuma salary. At this rate, you'll reach your $50,000 goal in 4 more months.")
        ]

        for idx, (p, r) in enumerate(ai_history):
            log = LLMLog(
                uid=UID,
                model="gemini-2.0-pro-exp",
                encrypted_prompt=encrypt_prompt(p, user_dek_ref=UID).encode('utf-8'),
                encrypted_response=encrypt_prompt(r, user_dek_ref=UID).encode('utf-8'),
                tokens=len(p) + len(r),
                user_dek_ref=UID,
                ts=datetime.utcnow() - timedelta(days=idx*2)
            )
            db.add(log)
        print(f"✅ Seeded {len(ai_history)} AI History logs in backend.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_data()
