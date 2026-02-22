
import logging
import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.getcwd())

from backend.core.config import settings
from backend.models import User
from backend.services.auth import create_identity_user, get_user, update_identity_user
from backend.services.billing import update_user_tier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_account(email, password="Password1!"):
    print(f"Fixing account for: {email}")

    # 1. Connect to DB
    db_url = settings.database_url
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print("❌ User not found in Postgres. Cannot restore.")
            return

        print(f"✅ Found User in DB: {user.uid}")

        # 2. Restore in Identity Platform
        try:
            # Check if user exists
            existing = get_user(user.uid)
            if not existing:
                create_identity_user(
                    email=user.email,
                    password=password,
                    uid=user.uid,
                    email_verified=True
                )
                print(f"✅ Re-created user in Identity Platform with password: {password}")
            else:
                print("⚠️ User already exists in Identity Platform.")
                update_identity_user(user.uid, password=password)
                print("Updated password.")

        except Exception as e:
            print(f"Error restoring user in Identity Platform: {e}")

        # 3. Update Subscription to Ultimate (Manual Override since webhook missed)
        print("Updating subscription to Ultimate...")
        update_user_tier(db, user.uid, "ultimate_monthly", status="active")
        print("✅ Subscription updated to Ultimate Monthly")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fix_account(sys.argv[1])
    else:
        fix_account("l2zpw.famtest@inbox.testmail.app")
