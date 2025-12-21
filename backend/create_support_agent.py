import argparse
import os
import sys

from firebase_admin import auth

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.user import User  # noqa: E402
from backend.services.auth import _get_firebase_app  # noqa: E402
from backend.utils import get_db  # noqa: E402

# Default strong password if none provided
DEFAULT_STRONG_PASSWORD = "SupportAgentSecure!2025"


def _ensure_firebase_user(email, password, verbose):
    try:
        try:
            user_record = auth.get_user_by_email(email)
            if verbose:
                print(
                    f"User {email} found in Firebase (uid: {user_record.uid}). Updating password..."
                )
            auth.update_user(user_record.uid, password=password)
            return user_record
        except auth.UserNotFoundError:
            if verbose:
                print(f"User {email} not found in Firebase. Creating...")
            user_record = auth.create_user(
                email=email, password=password, email_verified=True
            )
            if verbose:
                print(f"Firebase user created: {user_record.uid}")
            return user_record
    except Exception as e:
        print(f"Error managing Firebase user: {e}")
        return None


def _ensure_db_user(db, email, user_record, verbose):
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            if verbose:
                print("Creating DB user...")
            # Use the UID from Firebase to ensure sync
            user = User(uid=user_record.uid, email=email, role="support_agent")
            db.add(user)
        else:
            if verbose:
                print(f"Updating existing DB user {user.uid} role to support_agent...")
            # Update UID if it differs (e.g. if Firebase was reset but DB wasn't)
            if user.uid != user_record.uid:
                print(
                    f"WARNING: DB UID {user.uid} does not match Firebase UID {user_record.uid}. Updating DB to match Firebase."
                )
                user.uid = user_record.uid
            user.role = "support_agent"

        db.commit()
        if verbose:
            print(
                f"Successfully created/updated support agent {email} with role 'support_agent'"
            )

    except Exception as e:
        print(f"Error updating database: {e}")
        db.rollback()


def create_support_agent(email, password, verbose=True):
    if verbose:
        print(f"DTO Creating support agent: {email}")

    # 1. Init Firebase (with retry for emulator connection)
    try:
        _get_firebase_app()
    except Exception as e:
        print(f"Error initializing Firebase app: {e}")
        return

    db = next(get_db())

    # 2. Check/Create in Firebase
    user_record = _ensure_firebase_user(email, password, verbose)
    if not user_record:
        return

    # 3. Create/Update in Postgres
    _ensure_db_user(db, email, user_record, verbose)

    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or update a support agent")
    parser.add_argument("--email", required=True, help="Agent email")
    parser.add_argument(
        "--password", help="Agent password (optional, strong default used if omitted)"
    )

    args = parser.parse_args()

    pwd = args.password if args.password else DEFAULT_STRONG_PASSWORD

    create_support_agent(args.email, pwd)
