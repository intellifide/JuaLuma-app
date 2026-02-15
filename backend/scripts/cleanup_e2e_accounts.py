import os
import sys

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))


from backend.models import Account
from backend.utils.database import SessionLocal


def cleanup():
    db = SessionLocal()
    try:
        # Find e2e_owner
        owner_uid = "e2e_owner"
        print(f"Cleaning up accounts for {owner_uid}...")

        # Delete accounts
        deleted = db.query(Account).filter(Account.uid == owner_uid).delete()
        print(f"Deleted {deleted} accounts for {owner_uid}.")

        db.commit()
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
