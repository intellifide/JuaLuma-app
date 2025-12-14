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

@dev_mcp.tool()
async def verify_crypto_config() -> dict:
    """
    Verify Crypto/Web3 configuration.
    Checks:
    1. Ethereum RPC reachability (ETH_RPC_URL or default).
    2. CCXT library availability and exchange loading.
    """
    results = {}
    
    # 1. Web3 RPC
    rpc_url = settings.eth_rpc_url or "https://cloudflare-eth.com"
    try:
        async with httpx.AsyncClient() as client:
            # simple JSON-RPC ping: eth_blockNumber
            payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
            resp = await client.post(rpc_url, json=payload, timeout=5.0)
            if resp.status_code == 200 and "result" in resp.json():
                results["web3_rpc"] = f"reachable ({rpc_url})"
            else:
                results["web3_rpc"] = f"error: status {resp.status_code}"
    except Exception as e:
        results["web3_rpc"] = f"unreachable: {e}"

    # 2. CCXT
    try:
        import ccxt
        # Try loading a common exchange class to verify library integrity
        _ = ccxt.binanceus()
        results["ccxt"] = "installed and loadable (binanceus)"
    except ImportError:
        results["ccxt"] = "not installed"
    except Exception as e:
        results["ccxt"] = f"error loading: {e}"

    return results

@dev_mcp.tool()
def trigger_test_email(to_email: str) -> str:
    """
    Trigger a generic test email via the configured EmailClient.
    Useful for verifying SMTP or Mock behavior.
    """
    try:
        from backend.services.email import get_email_client
        client = get_email_client()
        client.send_generic_alert(to_email, "Test Email from Dev Tools")
        return f"Email dispatch triggered to {to_email}. Check logs or inbox."
    except Exception as e:
        return f"Failed to trigger email: {str(e)}"

@dev_mcp.tool()
def seed_support_tickets(email: str) -> str:
    """
    Seed support tickets for a given user email.
    Creates 3 tickets (Open, In Progress, Resolved).
    """
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            return f"User with email {email} not found."

        from backend.models.support import SupportTicket
        
        tickets = [
            {
                "subject": "Login Issue",
                "description": "I cannot login to my account.",
                "category": "account",
                "status": "open",
                "priority": "High"
            },
            {
                "subject": "Billing Question",
                "description": "Why was I charged twice?",
                "category": "billing",
                "status": "in_progress",
                "priority": "Normal"
            },
            {
                "subject": "Feature Request",
                "description": "Please add dark mode.",
                "category": "general",
                "status": "resolved",
                "priority": "Low"
            }
        ]

        for t in tickets:
            ticket = SupportTicket(
                user_id=user.uid,
                subject=t["subject"],
                description=t["description"],
                category=t["category"],
                status=t["status"]
                # We can't set it in constructor if it's not a column.
                # But we patched the model to have a Priority property.
                # Wait, 'status' IS a column (lowercase).
            )
            session.add(ticket)
        
        session.commit()
        return f"Seeded {len(tickets)} support tickets for {email}."

    except Exception as e:
        session.rollback()
        return f"Error seeding tickets: {str(e)}"
    finally:
        session.close()
