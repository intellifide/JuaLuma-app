"""
Seed initial test data into the database.
Replaces the data seeding part of the old init-db.sql.
"""

import os
import sys

# Ensure the parent directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models import Developer, Subscription, SupportAgent, User


def seed_data():
    if not settings.database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    print(f"Connecting to {settings.database_url}...")
    engine = create_engine(settings.database_url)
    session = Session(engine)

    try:
        print("Seeding Users...")
        users_data = [
            {"uid": "test-user-1", "email": "test@example.com", "role": "user"},
            {"uid": "test-dev-1", "email": "developer@example.com", "role": "user"},
            {"uid": "test-agent-1", "email": "agent@example.com", "role": "support_agent"},
            {"uid": "test-manager-1", "email": "manager@example.com", "role": "support_manager"},
            {"uid": "user_regular", "email": "user_regular@example.com", "role": "user"},
            {"uid": "agent_support_1", "email": "agent_support_1@example.com", "role": "support_agent"},
            {"uid": "manager_support", "email": "manager_support@example.com", "role": "support_manager"},
        ]

        for u_data in users_data:
            existing = session.scalar(select(User).where(User.uid == u_data["uid"]))
            if not existing:
                user = User(
                    uid=u_data["uid"],
                    email=u_data["email"],
                    role=u_data["role"],
                    # defaults: theme_pref='glass', currency_pref='USD', time_zone='UTC'
                )
                session.add(user)
        session.flush()

        print("Seeding Subscriptions...")
        subs_data = [
            {"uid": "test-user-1", "plan": "free"},
            {"uid": "test-dev-1", "plan": "pro"},
            {"uid": "test-agent-1", "plan": "free"},
            {"uid": "test-manager-1", "plan": "free"},
            {"uid": "user_regular", "plan": "free"},
            {"uid": "agent_support_1", "plan": "free"},
            {"uid": "manager_support", "plan": "free"},
        ]

        for s_data in subs_data:
            existing = session.scalar(select(Subscription).where(Subscription.uid == s_data["uid"]))
            if not existing:
                sub = Subscription(
                    uid=s_data["uid"],
                    plan=s_data["plan"],
                    status="active"
                )
                session.add(sub)
        session.flush()

        print("Seeding Developers...")
        # test-dev-1
        dev_uid = "test-dev-1"
        existing_dev = session.scalar(select(Developer).where(Developer.uid == dev_uid))
        if not existing_dev:
            # We must ensure the user exists first (handled above)
            dev = Developer(
                uid=dev_uid,
                payout_frequency="monthly"
            )
            session.add(dev)
        session.flush()

        print("Seeding Support Agents...")
        agents_data = [
            {"company_id": "INT-AGENT-2025-001", "name": "Test Agent", "email": "agent@example.com", "role": "support_agent"},
            {"company_id": "INT-AGENT-2025-002", "name": "Test Manager", "email": "manager@example.com", "role": "support_manager"},
            {"company_id": "INT-AGENT-2025-003", "name": "Agent Support 1", "email": "agent_support_1@example.com", "role": "support_agent"},
            {"company_id": "INT-AGENT-2025-004", "name": "Manager Support", "email": "manager_support@example.com", "role": "support_manager"},
        ]

        for a_data in agents_data:
             existing = session.scalar(select(SupportAgent).where(SupportAgent.company_id == a_data["company_id"]))
             if not existing:
                 agent = SupportAgent(
                     company_id=a_data["company_id"],
                     name=a_data["name"],
                     email=a_data["email"],
                     role=a_data["role"],
                     active=True
                 )
                 session.add(agent)

        session.commit()
        print("✅ Data seeding complete.")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding data: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_data()
