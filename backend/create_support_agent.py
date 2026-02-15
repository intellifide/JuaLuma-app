import argparse
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.user import User  # noqa: E402
from backend.services import auth  # noqa: E402
from backend.utils import get_db  # noqa: E402

# Default strong password if none provided
DEFAULT_STRONG_PASSWORD = "SupportAgentSecure!2025"


def _ensure_identity_user(email, password, verbose):
    try:
        user_record = auth.get_user_by_email(email)
        if user_record:
            uid = user_record["localId"]
            if verbose:
                print(
                    f"User {email} found in Identity Platform (uid: {uid}). Updating password..."
                )
            auth.update_user_password(uid, password)
            return user_record
        else:
            if verbose:
                print(f"User {email} not found in Identity Platform. Creating...")
            user_record = auth.create_identity_user(
                email=email, password=password, email_verified=True
            )
            if verbose:
                print(f"Identity user created: {user_record['localId']}")
            return user_record
    except Exception as e:
        print(f"Error managing Identity Platform user: {e}")
        return None


def _ensure_db_user(db, email, user_record, verbose):
    uid = user_record["localId"]
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            if verbose:
                print("Creating DB user...")
            # Use the UID from Identity Platform to ensure sync
            user = User(uid=uid, email=email, role="support_agent")
            db.add(user)
        else:
            if verbose:
                print(f"Updating existing DB user {user.uid} role to support_agent...")
            # Update UID if it differs (e.g. if Identity Platform was reset but DB wasn't)
            if user.uid != uid:
                print(
                    f"WARNING: DB UID {user.uid} does not match Identity UID {uid}. Updating DB to match."
                )
                user.uid = uid
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

    db = next(get_db())

    # 1. Check/Create in Identity Platform
    user_record = _ensure_identity_user(email, password, verbose)
    if not user_record:
        return

    # 2. Create/Update in Postgres
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
