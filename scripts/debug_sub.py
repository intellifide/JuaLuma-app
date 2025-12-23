import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.models import Payment, Subscription, User
from backend.utils import get_db


def debug_user(email):
    db = next(get_db())
    print(f"--- Debugging User: {email} ---")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        print("User not found!")
        return

    print(f"User UID: {user.uid}")
    print(f"Status: {user.status}")
    print(f"Is Developer: {user.developer}")

    # Check Subscription
    subs = db.query(Subscription).filter(Subscription.uid == user.uid).all()
    print(f"\nSubscriptions ({len(subs)}):")
    for s in subs:
        print(f"  - Plan: {s.plan}, Status: {s.status}, Created: {s.created_at}, Renew: {s.renew_at}")

    # Check Payment
    payments = db.query(Payment).filter(Payment.uid == user.uid).all()
    print(f"\nPayments ({len(payments)}):")
    for p in payments:
        print(f"  - Stripe Customer ID: {p.stripe_customer_id}")

if __name__ == "__main__":
    debug_user("bronneixeummouhoi-6179@yopmail.com")
