
import os
import sys
from datetime import datetime, timedelta

# Ensure backend module is in path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from backend.models import Subscription, User
from backend.utils.database import SessionLocal


def seed_e2e_users():
    db = SessionLocal()
    try:
        users = [
            {"uid": "e2e_owner", "email": "e2e_owner@example.com", "role": "user", "plan": "ultimate"},
            {"uid": "e2e_member", "email": "e2e_member@example.com", "role": "user", "plan": "free"},
            {"uid": "e2e_minor", "email": "e2e_minor@example.com", "role": "user", "plan": "free"},
        ]

        for u_data in users:
            existing = db.query(User).filter(User.uid == u_data["uid"]).first()
            if not existing:
                print(f"Creating user {u_data['uid']}...")
                new_user = User(
                    uid=u_data["uid"],
                    email=u_data["email"],
                    role=u_data["role"],
                    status="active",
                    mfa_enabled=False
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)

                # Create Subscription
                if u_data["plan"] != "free":
                    sub = Subscription(
                        uid=new_user.uid,
                        plan=u_data["plan"],
                        status="active",
                        # No stripe_subscription_id in model
                        renew_at=datetime.utcnow() + timedelta(days=30)
                    )
                    db.add(sub)
                    db.commit()
            else:
                print(f"User {u_data['uid']} already exists.")

    except Exception as e:
        print(f"Error checking/seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_e2e_users()
