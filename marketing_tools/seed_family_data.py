# Core Purpose: Comprehensive Family Seeding - Correcting roles and account assignments.
# Author: Antigravity
# Last Modified: 2026-02-02 19:44 CST

import os
import sys
import random
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.core.constants import UserStatus
from backend.models import (
    Account,
    Household,
    HouseholdMember,
    ManualAsset,
    SessionLocal,
    Subscription,
    Transaction,
    User,
)

JULIA_UID = "so2BKS6XymVult8VzjsHjg8mdVgX"

# Full Family Data Set
FAMILY_CONFIG = {
    "Julia": {
        "uid": JULIA_UID,
        "first": "Julia", "last": "Luma", "email": "marketing-ultimate-showcase@testmail.app", "role": "admin", "username": "julialuma",
        "accounts": [
            {"name": "Sapphire Checking", "prov": "Chase", "type": "traditional", "bal": "12450.75"},
            {"name": "Vanguard Brokerage", "prov": "Vanguard", "type": "investment", "bal": "245000.00"},
            {"name": "Main ETH Wallet", "prov": "Ethereum", "type": "web3", "bal": "42.50"},
            {"name": "Amex Platinum", "prov": "American Express", "type": "traditional", "bal": "-4250.20"},
            {"name": "Emergency Reserve", "prov": "Ally Bank", "type": "traditional", "bal": "55000.00"},
            {"name": "Vested Startup Equity", "prov": "Manual", "type": "manual", "bal": "125000.00", "override": "investment", "bal_type": "asset"},
            {"name": "Family Residence (San Francisco)", "prov": "Manual", "type": "manual", "bal": "2450000.00", "override": "real_estate", "bal_type": "asset"},
            {"name": "2024 Porsche Taycan", "prov": "Manual", "type": "manual", "bal": "145000.00", "override": "other", "bal_type": "asset"},
            {"name": "Vintage Watch Collection", "prov": "Manual", "type": "manual", "bal": "85000.00", "override": "collectible", "bal_type": "asset"}
        ]
    },
    "Mark": {
        "uid": "mark_luma_uid_marketing",
        "first": "Mark", "last": "Luma", "email": "mark@testmail.app", "role": "member", "username": "markluma",
        "accounts": [
            {"name": "Chase Ink Business", "prov": "Chase", "type": "traditional", "bal": "-12400.00"},
            {"name": "Fidelity 401k", "prov": "Fidelity", "type": "investment", "bal": "185000.00"},
            {"name": "Personal Savings", "prov": "Capital One", "type": "traditional", "bal": "12500.00"}
        ]
    },
    "Leo": {
        "uid": "leo_luma_uid_marketing",
        "first": "Leo", "last": "Luma", "email": "leo@testmail.app", "role": "member", "username": "leoluma",
        "accounts": [
            {"name": "Leo UTMA Custodial Savings", "prov": "Marcus by GS", "type": "investment", "bal": "2500.00"},
            {"name": "Leo Student First Rewards (Discover)", "prov": "Discover", "type": "traditional", "bal": "-150.00"}
        ]
    },
    "Mia": {
        "uid": "mia_luma_uid_marketing",
        "first": "Mia", "last": "Luma", "email": "mia@testmail.app", "role": "member", "username": "mialuma",
        "accounts": [
            {"name": "Mia 529 College Savings Plan", "prov": "Northern Trust", "type": "investment", "bal": "350000.00"}
        ]
    }
}

# Marketing Transactions to seed
MARKETING_TRANSACTIONS = {
    "Sapphire Checking": [
        {"desc": "Whole Foods Market", "amount": "-156.42", "cat": "Groceries", "days_ago": 2},
        {"desc": "Bouchon Bistro", "amount": "-245.00", "cat": "Dining", "days_ago": 5},
        {"desc": "PG&E Utilities", "amount": "-185.30", "cat": "Bills & Utilities", "days_ago": 12},
        {"desc": "Wells Fargo Mortgage", "amount": "-4200.00", "cat": "Housing", "days_ago": 15},
        {"desc": "Consulting Income", "amount": "8500.00", "cat": "Income", "days_ago": 1},
    ],
    "Amex Platinum": [
        {"desc": "United Airlines", "amount": "-850.00", "cat": "Travel", "days_ago": 20},
        {"desc": "Ritz Carlton Lake Tahoe", "amount": "-1250.00", "cat": "Travel", "days_ago": 18},
        {"desc": "Nordstrom", "amount": "-320.50", "cat": "Shopping", "days_ago": 8},
    ],
    "Chase Ink Business": [
        {"desc": "AWS Web Services", "amount": "-450.00", "cat": "Software", "days_ago": 3},
        {"desc": "Staples Office Supply", "amount": "-125.40", "cat": "Office", "days_ago": 10},
        {"desc": "Client Dinner - Fleming's", "amount": "-550.00", "cat": "Business Meals", "days_ago": 12},
    ],
    "Leo Student First Rewards (Discover)": [
        {"desc": "Starbucks", "amount": "-8.50", "cat": "Dining", "days_ago": 1},
        {"desc": "Amazon.com", "amount": "-45.20", "cat": "Shopping", "days_ago": 4},
        {"desc": "PlayStation Network", "amount": "-59.99", "cat": "Entertainment", "days_ago": 10},
    ],
    "Emergency Reserve": [
        {"desc": "Interest Deposit", "amount": "210.45", "cat": "Income", "days_ago": 30}
    ]
}

def seed_comprehensive_family_fixed():
    db = SessionLocal()
    try:
        hh = db.query(Household).filter(Household.owner_uid == JULIA_UID).first()
        if not hh:
            print("❌ Error: Household not found.")
            return

        print(f"🔄 Updating Household Admin roles...")
        # Ensure only Julia is admin in the actual HouseholdMember table
        members = db.query(HouseholdMember).filter(HouseholdMember.household_id == hh.id).all()
        for m in members:
            if m.uid == JULIA_UID:
                m.role = "admin"
            else:
                m.role = "member"
        db.flush()

        print(f"🧹 Clearing old accounts and manual assets for {JULIA_UID} to ensure clean marketing setup...")
        db.query(Account).filter(Account.uid == JULIA_UID).delete()
        db.query(ManualAsset).filter(ManualAsset.uid == JULIA_UID).delete()
        db.flush()

        for name, data in FAMILY_CONFIG.items():
            # 1. Ensure User 
            user = db.query(User).filter(User.uid == data["uid"]).first()
            if not user:
                user = User(
                    uid=data["uid"],
                    email=data["email"],
                    first_name=data["first"],
                    last_name=data["last"],
                    username=data["username"],
                    status=UserStatus.ACTIVE,
                    role="user"
                )
                db.add(user)
                db.flush()
                print(f"✅ Created User: {name}")
            else:
                # Update existing user details to ensure they have names
                user.first_name = data["first"]
                user.last_name = data["last"]
                user.username = data["username"]
                db.flush()
                print(f"✅ Updated User: {name}")

            # 1b. Ensure Subscription (Ultimate for Julia)
            if data["uid"] == JULIA_UID:
                sub = db.query(Subscription).filter(Subscription.uid == JULIA_UID).first()
                if not sub:
                    sub = Subscription(
                        uid=JULIA_UID,
                        plan="ultimate_annual",
                        status="active",
                        renew_at=datetime.now() + timedelta(days=365)
                    )
                    db.add(sub)
                    print(f"   💎 Created Ultimate Subscription for Julia")
                else:
                    sub.plan = "ultimate_annual"
                    sub.status = "active"
                    print(f"   💎 Updated Subscription to Ultimate for Julia")
                db.flush()

            # 2. Assign Accounts properly
            for a in data["accounts"]:
                # We search for the account under the MEMBER'S UID now, to ensure strict separation
                # The 'Family' view will aggregate them because Julia is the Admin of the Household
                
                # Check global existence first
                acc = db.query(Account).filter(Account.account_name == a["name"]).first()
                
                if not acc:
                    acc = Account(
                        uid=data["uid"], # Owned by the specific member
                        account_name=a["name"],
                        provider=a["prov"],
                        account_type=a["type"],
                        balance=Decimal(a["bal"]),
                        currency="USD",
                        assigned_member_uid=data["uid"],
                        category_override=a.get("override"),
                        balance_type=a.get("bal_type"),
                        last_synced_at=datetime.now(),
                        account_number_masked=f"•••• {str(uuid.uuid4().int)[:4]}"
                    )
                    db.add(acc)
                    db.flush() # Flush to get ID for manual asset creation
                    print(f"   💰 Created & Assigned: {a['name']} -> {name}")

                else:
                    # Update existing account assignment
                    acc.uid = data["uid"] # Ensure Member is the technical record owner
                    acc.assigned_member_uid = data["uid"]
                    acc.balance = Decimal(a["bal"])
                    acc.category_override = a.get("override")
                    acc.balance_type = a.get("bal_type")
                    acc.last_synced_at = datetime.now()
                    if not acc.account_number_masked:
                        acc.account_number_masked = f"•••• {str(uuid.uuid4().int)[:4]}"
                    print(f"   🔧 Corrected assignment: {a['name']} -> {name}")
                
                # 3a. If this is a Manual Account, ALSO seed a ManualAsset for the legacy view
                if a["type"] == "manual":
                    # Map override/type to allowed ManualAsset types: 'house', 'car', 'collectible', 'real_estate'
                    ma_type = "collectible" # Default fallback
                    lower_name = a["name"].lower()
                    
                    if a.get("override") == "real_estate" or "residence" in lower_name:
                        ma_type = "house"
                    elif a.get("override") == "other" and "porsche" in lower_name:
                        ma_type = "car"
                    elif a.get("override") == "collectible":
                        ma_type = "collectible"
                    
                    # Check if exists to avoid dupes (though we flushed above)
                    # We accept duplication if manual asset exists but is different
                    # For now, simplistic check by name
                    existing_ma = db.query(ManualAsset).filter(ManualAsset.uid == data["uid"], ManualAsset.name == a["name"]).first()
                    if not existing_ma:
                        ma = ManualAsset(
                            uid=data["uid"], # Owned by member
                            asset_type=ma_type,
                            balance_type=a.get("bal_type", "asset"),
                            name=a["name"],
                            value=Decimal(a["bal"]),
                            purchase_date=datetime.now().date(),
                            notes=f"Marketing seed for {a['name']}"
                        )
                        db.add(ma)
                        print(f"      🏗️ Created ManualAsset counterpart: {a['name']} ({ma_type})")


                
                # 3. Seed Transactions for this account
                # Clear existing transactions for this account first to avoid dupes on re-run
                db.query(Transaction).filter(Transaction.account_id == acc.id).delete()
                
                # Check if we have specific transactions defined
                if a["name"] in MARKETING_TRANSACTIONS:
                    # Add specific fixed marketing transactions
                    for t in MARKETING_TRANSACTIONS[a["name"]]:
                        trans_date = datetime.now() - timedelta(days=t["days_ago"])
                        trans = Transaction(
                            uid=acc.uid, # Owner UID
                            account_id=acc.id,
                            ts=trans_date,
                            amount=Decimal(t["amount"]),
                            currency="USD",
                            category=t["cat"],
                            merchant_name=t["desc"],
                            description=t["desc"],
                            is_manual=False, # Treated as 'real' imported transactions
                            external_id=str(uuid.uuid4()) # Fake external ID
                        )
                        db.add(trans)
                
                # Seed 24 months of consistent bill history for system analysis
                def seed_recurring_bill(bill_desc, bill_amt, bill_cat, day_of_month):
                    current_date = datetime.now()
                    for i in range(24): # 2 years history
                        # Calculate target month/year
                        # Go back i months
                        # Simple logic to handle year rollover
                        target_month = current_date.month - i
                        target_year = current_date.year
                        while target_month <= 0:
                            target_month += 12
                            target_year -= 1
                        
                        # Handle days at end of month (e.g. Feb 30 -> Feb 28)
                        try:
                            dt = datetime(target_year, target_month, day_of_month)
                        except ValueError:
                            # Fallback to 28th if day is invalid (e.g. Feb 30)
                            dt = datetime(target_year, target_month, 28)
                        
                        # Skip if future (shouldn't happen with logic above but safe check)
                        if dt > datetime.now():
                            continue

                        trans = Transaction(
                            uid=acc.uid,
                            account_id=acc.id,
                            ts=dt,
                            amount=Decimal(bill_amt),
                            currency="USD",
                            category=bill_cat,
                            merchant_name=bill_desc,
                            description=bill_desc,
                            is_manual=False,
                            external_id=str(uuid.uuid4())
                        )
                        db.add(trans)

                # Assign bills to specific accounts
                if name == "Julia":
                    if a["name"] == "Sapphire Checking":
                        seed_recurring_bill("Wells Fargo Mortgage", "-4200.00", "Housing", 1)
                        seed_recurring_bill("PG&E Utilities", "-185.30", "Bills & Utilities", 15)
                    elif a["name"] == "Amex Platinum":
                        seed_recurring_bill("Netflix", "-15.49", "Entertainment", 20)
                        seed_recurring_bill("Comcast Internet", "-85.00", "Bills & Utilities", 10)
                        seed_recurring_bill("Peloton Membership", "-44.00", "Health", 5)

                elif name == "Mark":
                    if a["name"] == "Chase Ink Business":
                        seed_recurring_bill("State Farm Auto", "-220.00", "Insurance", 25)
                        seed_recurring_bill("Spotify Family", "-16.99", "Entertainment", 3)
                        seed_recurring_bill("AT&T Wireless", "-140.00", "Bills & Utilities", 18)
                        seed_recurring_bill("YT Premium", "-13.99", "Entertainment", 12)

                # Add random filler transactions
                # Range 50-70 per account, spread over 2 years
                RANDOM_MERCHANTS = [
                    ("Uber Rides", "Transport", -15.00, -45.00),
                    ("Starbucks", "Dining", -5.00, -12.00),
                    ("Shell Oil", "Transport", -40.00, -60.00),
                    ("Apple Services", "Entertainment", -2.99, -14.99),
                    ("Target", "Shopping", -20.00, -150.00),
                    ("Trader Joe's", "Groceries", -30.00, -90.00),
                    ("Spotify", "Entertainment", -11.99, -11.99),
                    ("Netflix", "Entertainment", -15.49, -19.99),
                    ("CVS Pharmacy", "Health", -10.00, -40.00),
                    ("DoorDash", "Dining", -25.00, -50.00),
                    ("Whole Foods", "Groceries", -50.00, -150.00),
                    ("Chevron", "Transport", -30.00, -50.00),
                    ("Home Depot", "Home Improvement", -50.00, -200.00),
                    ("Shake Shack", "Dining", -15.00, -35.00),
                ]
                
                for _ in range(random.randint(50, 70)):
                    merch, cat, min_amt, max_amt = random.choice(RANDOM_MERCHANTS)
                    amt = round(random.uniform(min_amt, max_amt), 2)
                    days_ago = random.randint(1, 730) # Look back 2 years for randoms, matching bills history
                    
                    trans = Transaction(
                        uid=acc.uid,
                        account_id=acc.id,
                        ts=datetime.now() - timedelta(days=days_ago),
                        amount=Decimal(amt),
                        currency="USD",
                        category=cat,
                        merchant_name=merch,
                        description=merch,
                        is_manual=False,
                        external_id=str(uuid.uuid4())
                    )
                    db.add(trans)

                print(f"      📝 Seeded transactions for {a['name']}")

            
        db.commit()
        print("\n✨ RE-SYNC COMPLETE: Julia is the sole Admin. All data mapped for Ultimate Showcase.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during re-sync: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_comprehensive_family_fixed()
