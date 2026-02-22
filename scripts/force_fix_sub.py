import os
import sys

sys.path.append(os.getcwd())

from backend.models import User
from backend.services.billing import update_user_tier
from backend.utils import get_db


def force_fix_user(email):
    print(f"Force fixing user {email}...")
    db = next(get_db())
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print("User not found")
        return

    print(f"Current Status: {user.status}")
    # Force update to Essential Monthly
    update_user_tier(db, user.uid, "essential_monthly", status="active")
    print("Update complete.")

if __name__ == "__main__":
    force_fix_user("bronneixeummouhoi-6179@yopmail.com")
