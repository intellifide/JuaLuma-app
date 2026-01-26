from sqlalchemy.orm import Session

from backend.models import SubscriptionTier
from backend.utils import get_db


def seed_plans():
    db: Session = next(get_db())

    plans = [
        {
            "code": "free",
            "name": "Free",
            "description": "Basic accounts and tracking",
            "amount_cents": 0,
            "currency": "USD",
            "interval": "month",
            "price_id": None,
            "features": [
                "2 Traditional Accounts",
                "1 Investment / Web3 / CEX",
                "20 AI Queries/Day",
                "45-day Data Retention",
                "No Marketplace Access"
            ]
        },
        {
            "code": "essential_monthly",
            "name": "Essential",
            "description": "For serious personal finance management",
            "amount_cents": 1200,
            "currency": "USD",
            "interval": "month",
            "price_id": "price_1SftXDRQfRSwy2AaP2V5zy32",
            "features": [
                "3 Traditional / CEX Accounts",
                "2 Investment Accounts",
                "30 AI Queries/Day",
                "Current + Previous Year Retention",
                "Daily Automated Sync"
            ]
        },
        {
            "code": "pro_monthly",
            "name": "Pro",
            "description": "Professional tools for wealth builders",
            "amount_cents": 2500,
            "currency": "USD",
            "interval": "month",
            "price_id": "price_1SftXERQfRSwy2AaoWXBD9Q7",
            "features": [
                "5 Accounts (All Types)",
                "10 CEX Accounts",
                "40 AI Queries/Day",
                "Full History Retention",
                "14-Day Free Trial",
                "Full Marketplace Access"
            ]
        },
        {
            "code": "pro_annual",
            "name": "Pro Annual",
            "description": "Professional tools - 2 Months Free",
            "amount_cents": 25000,
            "currency": "USD",
            "interval": "year",
            "price_id": "price_1SftXERQfRSwy2Aa84D0XrhT",
            "features": [
                "Everything in Pro Monthly",
                "Save $50/year"
            ]
        },
        {
            "code": "ultimate_monthly",
            "name": "Ultimate",
            "description": "The complete financial operating system",
            "amount_cents": 6000,
            "currency": "USD",
            "interval": "month",
            "price_id": "price_1SftXFRQfRSwy2Aas3bHnACi",
            "features": [
                "20 Accounts (All Types)",
                "80 AI Queries/Day",
                "Family Features",
                "Full History Retention",
                "Full Marketplace Access",
                "14-Day Free Trial"
            ]
        },
        {
            "code": "ultimate_annual",
            "name": "Ultimate Annual",
            "description": "Ultimate power - 2 Months Free",
            "amount_cents": 60000,
            "currency": "USD",
            "interval": "year",
            "price_id": "price_1SftXFRQfRSwy2AapSGEb9HA",
            "features": [
                "Everything in Ultimate Monthly",
                "Save $120/year",
                "Family Features Included"
            ]
        }
    ]

    print("Seeding Subscription Plans...")
    for plan_data in plans:
        # Check if plan exists (by code)
        tier = db.query(SubscriptionTier).filter(SubscriptionTier.code == plan_data["code"]).first()
        if not tier:
            tier = SubscriptionTier(**plan_data)
            db.add(tier)
            print(f"Created: {plan_data['name']}")
        else:
            tier.name = plan_data["name"]
            tier.description = plan_data["description"]
            tier.amount_cents = plan_data["amount_cents"]
            tier.currency = plan_data["currency"]
            tier.interval = plan_data["interval"]
            tier.price_id = plan_data["price_id"]
            tier.features = plan_data["features"]
            print(f"Updated: {plan_data['name']}")

    db.commit()
    print("Seeding Complete.")

if __name__ == "__main__":
    seed_plans()
