import os
import sys

import stripe

# Add project root to path
sys.path.append(os.getcwd())

from backend.core.config import settings

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

def check_sub_price(sub_id: str):
    print(f"--- Checking Subscription {sub_id} ---")
    try:
        sub = stripe.Subscription.retrieve(sub_id, expand=['items.data.price'])
        # Items is a ListObject
        for item in sub['items']['data']:
            price = item['price']
            print(f"Price ID: {price.id}")
            print(f"Product ID: {price.product}")
            print(f"Recurring: {price.recurring}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_sub_price("sub_1SgsFpRQfRSwy2Aa7tZivdqF")
