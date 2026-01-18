
import sys
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.getcwd())

from backend.models import User
from backend.services.billing import update_user_tier
from backend.core.config import settings
from firebase_admin import auth, initialize_app

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

        # 2. Restore in Firebase
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "localhost:9099"
        os.environ["FIREBASE_PROJECT_ID"] = "jualuma-local"
        try:
             initialize_app(options={"projectId": "jualuma-local"})
        except ValueError:
            pass

        try:
            auth.create_user(
                uid=user.uid,
                email=user.email,
                password=password,
                email_verified=True # Assume verified since we are fixing
            )
            print(f"✅ Re-created user in Firebase with password: {password}")
        except auth.EmailAlreadyExistsError:
            print("⚠️ User email already exists in Firebase (unexpected based on diagnosis).")
            # Update password just in case
            auth.update_user(user.uid, password=password)
            print("Updated password.")
        except auth.UidAlreadyExistsError:
            print("⚠️ User UID already exists in Firebase.")
            auth.update_user(user.uid, password=password)
            print("Updated password.")
            
        # 3. Update Subscription to Ultimate (Manual Override since webhook missed)
        print("Updating subscription to Ultimate...")
        update_user_tier(db, user.uid, "ultimate_monthly", status="active")
        print("✅ Subscription updated to Ultimate Monthly")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_account("l2zpw.famtest@inbox.testmail.app")
