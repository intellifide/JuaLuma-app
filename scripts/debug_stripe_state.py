import os
import sys

import stripe
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.getcwd())

from backend.core.config import settings
from backend.models import Payment, User
from backend.utils import get_db

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

def inspect_stripe_state(email: str):
    print(f"--- Inspecting State for {email} ---")

    # 1. Check DB User
    db: Session = next(get_db())
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print("!! User not found in Postgres.")
        return

    print(f"User UID: {user.uid}")
    print(f"Status: {user.status}")

    # 2. Check DB Payment Record
    payment = db.query(Payment).filter(Payment.uid == user.uid).first()
    if payment:
        print(f"Linked Stripe Customer ID (DB): {payment.stripe_customer_id}")
    else:
        print("!! No Payment record found in DB for this user.")

    # 3. Query Stripe for Customers with this email
    print("\n--- Querying Stripe API ---")
    try:
        customers = stripe.Customer.list(email=email, limit=5, expand=['data.subscriptions'])
        print(f"Found {len(customers.data)} customers in Stripe for this email.")

        for cus in customers.data:
            print(f"\nCustomer ID: {cus.id}")
            print(f"Metadata: {cus.metadata}")

            if not cus.subscriptions.data:
                print("  No active subscriptions.")
            else:
                for sub in cus.subscriptions.data:
                    print(f"  Subscription: {sub.id}")
                    print(f"  Status: {sub.status}")
                    print(f"  Plan Price ID: {sub.items.data[0].price.id}")
                    print(f"  Plan Product ID: {sub.items.data[0].price.product}")

                    # Check our mapping
                    from backend.services.billing import STRIPE_PRICE_TO_TIER
                    mapped_tier = STRIPE_PRICE_TO_TIER.get(sub.items.data[0].price.id)
                    print(f"  Mapped Internal Tier: {mapped_tier}")

                    if not mapped_tier:
                        print(f"!! VALIDATION FAILURE: Price ID {sub.items.data[0].price.id} is NOT in backend mapping!")

    except Exception as e:
        print(f"Stripe API Error: {e}")

if __name__ == "__main__":
    inspect_stripe_state("bronneixeummouhoi-6179@yopmail.com")
