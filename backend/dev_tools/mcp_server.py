from fastmcp import FastMCP
from sqlalchemy import text
from backend.core import settings
from backend.models import SessionLocal
from backend.models.user import User
from backend.models.subscription import Subscription
from backend.core.constants import SubscriptionPlans
from backend.models.transaction import Transaction
from uuid import uuid4
import httpx
import asyncio
import logging
import os
import subprocess

# Initialize the Dev Tools MCP server
dev_mcp = FastMCP("Finity Dev Tools")
logger = logging.getLogger(__name__)

@dev_mcp.tool()
async def verify_integrations() -> dict:
    """Verify connectivity to external services (Stripe, Plaid, Firebase, Pub/Sub)."""
    results = {}

    # Stripe
    if settings.stripe_secret_key and settings.stripe_secret_key.startswith("sk_test"):
        results["stripe"] = "configured (test mode)"
    else:
        results["stripe"] = "warning: not in test mode or missing key"

    # Plaid
    if settings.plaid_env == "sandbox":
        results["plaid"] = "configured (sandbox)"
    else:
        results["plaid"] = f"warning: env is {settings.plaid_env}"

    # Firebase Emulator
    firestore_host = settings.firestore_emulator_host
    if firestore_host:
        try:
            # Simple check if authorized or reachable. 
            # Note: Emulator HTTP interface is usually at the port.
            # We'll just check if the host is set for now as a proxy for "configured"
            # Actual HTTP connectivity check:
            async with httpx.AsyncClient() as client:
                # The emulator UI/hub is often on a different port, but the service port should accept connections.
                # Just checking configuration existence here as per prompt logic "Ping settings.FIRESTORE... via HTTP HEAD"
                # The prompt asks to ping via HTTP HEAD.
                # Firestore emulator host is like "firebase-emulator:8080".
                # We are inside the container, so we can reach it.
                url = f"http://{firestore_host}"
                resp = await client.head(url, timeout=2.0)
                results["firebase"] = f"reachable ({resp.status_code})"
        except Exception as e:
            results["firebase"] = f"error: {str(e)}"
    else:
        results["firebase"] = "not configured"

    # Pub/Sub Emulator
    pubsub_host = settings.pubsub_emulator_host
    if pubsub_host:
        try:
             async with httpx.AsyncClient() as client:
                url = f"http://{pubsub_host}"
                resp = await client.head(url, timeout=2.0)
                results["pubsub"] = f"reachable ({resp.status_code})"
        except Exception as e:
            results["pubsub"] = f"error: {str(e)}"
    else:
        results["pubsub"] = "not configured"

    return results

@dev_mcp.tool()
def seed_database(tier: str = "free") -> str:
    """Seed the database with a test user, subscription, and transactions."""
    session = SessionLocal()
    try:
        # Create User
        user_id = uuid4()
        test_email = f"test_{tier}_{user_id.hex[:8]}@example.com"
        auth_uid = f"test_{tier}_{user_id.hex[:8]}"
        
        user = User(
            id=user_id,
            email=test_email,
            auth_uid=auth_uid,
            full_name=f"Test User {tier.title()}",
            is_active=True
        )
        session.add(user)
        session.flush()

        # Create Subscription
        plan = SubscriptionPlans.PRO if tier.lower() == "pro" else SubscriptionPlans.FREE
        subscription = Subscription(
            user_id=user.id,
            plan=plan,
            is_active=True
        )
        session.add(subscription)

        # Create Transactions
        for i in range(10):
            tx = Transaction(
                user_id=user.id,
                amount=10.0 + i,
                description=f"Test Transaction {i+1}",
                date="2024-01-01" # Simplified date
            )
            session.add(tx)

        session.commit()
        return f"Database seeded for user {test_email} ({tier})"
    except Exception as e:
        session.rollback()
        logger.error(f"Seeding failed: {e}")
        return f"Error seeding database: {str(e)}"
    finally:
        session.close()

@dev_mcp.tool()
def reset_local_state() -> str:
    """Reset the local database state (downgrade then upgrade alembic)."""
    if settings.app_env.lower() != "local":
        return "Error: Command only allowed in LOCAL environment."

    try:
        # We are in /app directory in docker, alembic.ini is at /app/alembic.ini
        # Run alembic downgrade base
        subprocess.run(["alembic", "downgrade", "base"], check=True, cwd="/app")
        # Run alembic upgrade head
        subprocess.run(["alembic", "upgrade", "head"], check=True, cwd="/app")
        return "Local state reset successfully."
    except subprocess.CalledProcessError as e:
        return f"Error resetting state: {str(e)}"
