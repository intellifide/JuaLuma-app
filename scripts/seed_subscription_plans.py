
import logging

from backend.core.constants import UserStatus
from backend.models import (
    Subscription,
    SubscriptionTier,
    User,
)
from backend.models.base import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Plan data matching STRIPE_PLANS in backend/services/billing.py
TIERS = [
    {
        "code": "free",
        "name": "Free",
        "description": "Basic accounts and tracking",
        "price_id": None,
        "amount_cents": 0,
        "currency": "usd",
        "interval": "month",
        "features": [
            "3 Traditional Accounts (via Plaid)",
            "1 Web3 Wallet",
            "1 CEX Account",
            "10 AI Queries/Day",
            "Transaction History: Last 45 Days",
        ],
        "is_active": True,
    },
    {
        "code": "essential_monthly",
        "name": "Essential",
        "description": "For serious personal finance management",
        "price_id": "price_1SftXDRQfRSwy2AaP2V5zy32",
        "amount_cents": 1200,
        "currency": "usd",
        "interval": "month",
        "features": [
            "5 Traditional Accounts (via Plaid)",
            "1 Web3 Wallet",
            "1 CEX Account",
            "30 AI Queries/Day",
            "Transaction History: Rolling 365 Days",
            "Daily Automated Sync",
        ],
        "is_active": True,
    },
    {
        "code": "pro_monthly",
        "name": "Pro",
        "description": "Professional tools for wealth builders",
        "price_id": "price_1SftXERQfRSwy2AaoWXBD9Q7",
        "amount_cents": 2500,
        "currency": "usd",
        "interval": "month",
        "features": [
            "10 Traditional Accounts (via Plaid)",
            "2 Web3 Wallets",
            "3 CEX Accounts",
            "40 AI Queries/Day",
            "Transaction History: All-Time",
            "14-Day Free Trial",
            "Full Marketplace Access",
        ],
        "is_active": True,
    },
    {
        "code": "pro_annual",
        "name": "Pro Annual",
        "description": "Professional tools - 2 Months Free",
        "price_id": "price_1SftXERQfRSwy2Aa84D0XrhT",
        "amount_cents": 25000,
        "currency": "usd",
        "interval": "year",
        "features": [
            "Everything in Pro Monthly",
            "Save $50/year",
            "14-Day Free Trial",
        ],
        "is_active": True,
    },
    {
        "code": "ultimate_monthly",
        "name": "Ultimate",
        "description": "The complete financial operating system",
        "price_id": "price_1SftXFRQfRSwy2Aas3bHnACi",
        "amount_cents": 6000,
        "currency": "usd",
        "interval": "month",
        "features": [
            "40 Traditional Accounts (via Plaid)",
            "8 Web3 Wallets",
            "5 CEX Accounts",
            "80 AI Queries/Day",
            "Family Features (4 members total)",
            "Transaction History: All-Time",
            "Full Marketplace Access",
            "14-Day Free Trial",
        ],
        "is_active": True,
    },
    {
        "code": "ultimate_annual",
        "name": "Ultimate Annual",
        "description": "Ultimate power - 2 Months Free",
        "price_id": "price_1SftXFRQfRSwy2AapSGEb9HA",
        "amount_cents": 60000,
        "currency": "usd",
        "interval": "year",
        "features": [
            "Everything in Ultimate Monthly",
            "Save $120/year",
            "Family Features (4 members total)",
        ],
        "is_active": True,
    },
]

TEST_USER = {
    "uid": "test-user-123",
    "email": "test@example.com",
    "status": UserStatus.ACTIVE,
    "role": "user",
}

def seed():
    db = SessionLocal()
    try:
        logger.info("Seeding subscription tiers...")
        for tier_data in TIERS:
            existing = db.query(SubscriptionTier).filter(SubscriptionTier.code == tier_data["code"]).first()
            if existing:
                for key, value in tier_data.items():
                    setattr(existing, key, value)
                logger.info(f"Updated tier: {tier_data['code']}")
            else:
                new_tier = SubscriptionTier(**tier_data)
                db.add(new_tier)
                logger.info(f"Created tier: {tier_data['code']}")

        logger.info("Seeding test user...")
        # Search by email first, then UID
        user = db.query(User).filter(User.email == TEST_USER["email"]).first()
        if not user:
            user = db.query(User).filter(User.uid == TEST_USER["uid"]).first()

        if not user:
            user = User(**TEST_USER)
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created test user: {user.email}")
        else:
            # Update existing user fields (except UID if we matched by email)
            user.status = TEST_USER["status"]
            user.role = TEST_USER["role"]
            db.commit()
            logger.info(f"Updated existing test user: {user.email} (UID: {user.uid})")

        # Ensure active subscription for test user
        sub = db.query(Subscription).filter(Subscription.uid == user.uid).first()
        if not sub:
            sub = Subscription(uid=user.uid, plan="free", status="active")
            db.add(sub)
            logger.info(f"Created default free subscription for test user {user.uid}")
        else:
            logger.info(f"Test user {user.uid} already has a subscription: {sub.plan}")

        db.commit()
        logger.info("Seeding complete.")
    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
