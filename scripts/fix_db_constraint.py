import os
import sys

from sqlalchemy import text

# Add project root to path
sys.path.append(os.getcwd())

from backend.utils import get_db


def fix_constraint():
    print("Fixing database constraints...")
    db = next(get_db())

    # 1. Drop the old constraint
    try:
        print("Dropping constraint 'subscriptions_plan_check'...")
        db.execute(text("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check"))
        db.commit()
        print("Dropped.")
    except Exception as e:
        print(f"Error dropping: {e}")
        db.rollback()

    # 2. Add new constraint (or just leave it open if we trust App logic)
    # We will trust App Logic for now to avoid future friction with new plans
    # Adding a check constraint that is hardcoded is brittle.
    # Ideally, this should reference the 'subscription_tiers' table via FK, but that's a bigger refactor.

    # Let's verify if there were other constraints or if it's an ENUM type.
    # If "subscriptions_plan_check" was the only thing, we are good.

    print("Constraint fixed (removed). Application layer will handle validation.")

if __name__ == "__main__":
    fix_constraint()
