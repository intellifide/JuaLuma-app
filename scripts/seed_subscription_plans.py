
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
        "features": ["Connect up to 2 accounts", "Basic analytics", "Manual asset tracking"],
        "is_active": True,
    },
    {
        "code": "essential_monthly",
        "name": "Essential Monthly",
        "description": "For serious personal finance management",
        "price_id": "price_1SftXDRQfRSwy2AaP2V5zy32",
        "amount_cents": 999,
        "currency": "usd",
        "interval": "month",
        "features": ["Unlimited accounts", "Advanced analytics", "Budgeting tools", "Daily syncing"],
        "is_active": True,
    },
    {
        "code": "pro_monthly",
        "name": "Pro Monthly",
        "description": "Professional tools for wealth builders",
        "price_id": "price_1SftXERQfRSwy2AaoWXBD9Q7",
        "amount_cents": 1999,
        "currency": "usd",
        "interval": "month",
        "features": ["Everything in Essential", "AI Financial Assistant", "Custom reports", "Priority support"],
        "is_active": True,
    },
    {
        "code": "pro_annual",
        "name": "Pro Annual",
        "description": "Best value for wealth builders",
        "price_id": "price_1SftXERQfRSwy2Aa84D0XrhT",
        "amount_cents": 19990,
        "currency": "usd",
        "interval": "year",
        "features": ["Everything in Essential", "AI Financial Assistant", "Custom reports", "Priority support"],
        "is_active": True,
    },
    {
        "code": "ultimate_monthly",
        "name": "Ultimate Monthly",
        "description": "The complete financial operating system",
        "price_id": "price_1SftXFRQfRSwy2Aas3bHnACi",
        "amount_cents": 4999,
        "currency": "usd",
        "interval": "month",
        "features": ["Everything in Pro", "Developer SDK access", "Custom widgets", "Early access features"],
        "is_active": True,
    },
    {
        "code": "ultimate_annual",
        "name": "Ultimate Annual",
        "description": "The complete financial operating system",
        "price_id": "price_1SftXFRQfRSwy2AapSGEb9HA",
        "amount_cents": 49990,
        "currency": "usd",
        "interval": "year",
        "features": ["Everything in Pro", "Developer SDK access", "Custom widgets", "Early access features"],
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
