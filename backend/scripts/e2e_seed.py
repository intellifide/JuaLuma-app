
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

        # --- SEED HOUSEHOLD FOR E2E ---
        # 1. Check if household exists for owner
        from backend.models import Household, HouseholdMember
        
        # Check if owner is already in a household
        owner_member = db.query(HouseholdMember).filter(HouseholdMember.uid == "e2e_owner").first()
        if not owner_member:
            print("Creating Household for e2e_owner...")
            household = Household(owner_uid="e2e_owner", name="The Jetsons E2E")
            db.add(household)
            db.flush() # Get ID
            
            # Add Owner
            owner_m = HouseholdMember(
                household_id=household.id,
                uid="e2e_owner",
                role="admin",
                joined_at=datetime.utcnow(),
                can_view_household=True,
                ai_access_enabled=True
            )
            db.add(owner_m)
            db.commit()
            household_id = household.id
            print(f"Created Household {household_id}")
        else:
            household_id = owner_member.household_id
            print(f"e2e_owner is already in household {household_id}")
            
        # 2. Add other members if not already in
        members_to_add = [
            {"uid": "e2e_member", "role": "member", "ai": True},
            {"uid": "e2e_minor", "role": "restricted_member", "ai": False}
        ]
        
        for m_data in members_to_add:
            mem = db.query(HouseholdMember).filter(HouseholdMember.uid == m_data["uid"]).first()
            if not mem:
                print(f"Adding {m_data['uid']} to household...")
                new_mem = HouseholdMember(
                    household_id=household_id,
                    uid=m_data["uid"],
                    role=m_data["role"],
                    joined_at=datetime.utcnow(),
                    can_view_household=True,
                    ai_access_enabled=m_data["ai"]
                )
                db.add(new_mem)
                db.commit()
            else:
                print(f"{m_data['uid']} is already in a household.")

    except Exception as e:
        print(f"Error checking/seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_e2e_users()
