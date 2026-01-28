# CORE PURPOSE: Debugging script for verifying Stripe checkout sessions.
# LAST MODIFIED: 2025-12-21 16:50 CST
"""
Stripe Session Verification Test Script

This script helps debug Stripe checkout session verification issues.
Run this with a session_id to see exactly what data Stripe is returning.

Usage:
    python backend/scripts/test_stripe_session.py cs_test_xxxxxxxxxxxxx
"""

import os
import sys

import pytest

# Skip in pytest runs unless explicitly enabled.
if os.getenv("RUN_SCRIPTS_TESTS") != "1":
    pytest.skip(
        "Skipping script-style tests; set RUN_SCRIPTS_TESTS=1 to enable.",
        allow_module_level=True,
    )

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import stripe

from backend.core import settings
from backend.services.billing import STRIPE_PRICE_TO_TIER


def _print_session_basics(session: stripe.checkout.Session):
    """Print basic session info."""
    print("Session Details:")
    print(f"  ID: {session.id}")
    print(f"  Payment Status: {session.payment_status}")
    print(f"  Status: {session.status}")
    print(f"  Customer: {session.customer}")


def _print_metadata(session: stripe.checkout.Session):
    """Print session metadata."""
    print("\nMetadata:")
    if session.metadata:
        for key, value in session.metadata.items():
            print(f"  {key}: {value}")
    else:
        print("  ⚠️  No metadata found!")


def _print_line_items(session: stripe.checkout.Session):
    """Print session line items."""
    print("\nLine Items:")
    if session.line_items and session.line_items.data:
        for item in session.line_items.data:
            print(f"  - {item.description}")
            print(f"    Price ID: {item.price.id}")
            print(f"    Amount: ${item.amount_total / 100:.2f}")

            # Check if price maps to a tier
            tier = STRIPE_PRICE_TO_TIER.get(item.price.id)
            if tier:
                print(f"    ✅ Maps to tier: {tier}")
            else:
                print("    ❌ Price ID not found in STRIPE_PRICE_TO_TIER mapping!")
    else:
        print("  ⚠️  No line items found (this might be the issue!)")


def _print_subscription_info(session: stripe.checkout.Session):
    """Print subscription details."""
    print("\nSubscription:")
    if session.subscription:
        print(f"  Subscription ID: {session.subscription}")

        # Try to get subscription details
        try:
            sub = stripe.Subscription.retrieve(session.subscription)
            if sub.items and sub.items.data:
                price_id = sub.items.data[0].price.id
                print(f"  Price ID: {price_id}")
                tier = STRIPE_PRICE_TO_TIER.get(price_id)
                if tier:
                    print(f"  ✅ Maps to tier: {tier}")
                else:
                    print("  ❌ Price ID not in STRIPE_PRICE_TO_TIER mapping!")
        except Exception as e:
            print(f"  ⚠️  Could not retrieve subscription details: {e}")
    else:
        print("  No subscription (one-time payment)")


def _run_verification_checks(session: stripe.checkout.Session):
    """Run verification checks and print results."""
    print(f"\n{'='*60}")
    print("Verification Check:")
    print(f"{'='*60}")

    uid = session.metadata.get("uid") if session.metadata else None
    plan_type = session.metadata.get("plan") if session.metadata else None

    print("\n1. Payment Status Check:")
    if session.payment_status == "paid":
        print("   ✅ Payment status is 'paid'")
    else:
        print(f"   ❌ Payment status is '{session.payment_status}' (expected 'paid')")

    print("\n2. User ID Check:")
    if uid:
        print(f"   ✅ UID found in metadata: {uid}")
    else:
        print("   ❌ UID missing from metadata!")

    print("\n3. Plan Type Check:")
    if plan_type:
        print(f"   ✅ Plan type found in metadata: {plan_type}")
    else:
        print("   ❌ Plan type missing from metadata!")

    print("\n4. Overall Verification:")
    if session.payment_status == "paid" and uid and plan_type:
        print("   ✅ Session should verify successfully")
        print(f"   → User {uid} should be upgraded to plan '{plan_type}'")
    else:
        print("   ❌ Session verification would fail")


def test_session_retrieval(session_id: str):
    """Test retrieving and analyzing a Stripe session"""

    if not settings.stripe_secret_key:
        print("❌ ERROR: Stripe secret key not configured")
        return

    stripe.api_key = settings.stripe_secret_key

    print(f"\n{'='*60}")
    print(f"Testing Stripe Session: {session_id}")
    print(f"{'='*60}\n")

    try:
        # Retrieve session with expanded data
        print("📥 Retrieving session from Stripe...")
        session = stripe.checkout.Session.retrieve(
            session_id, expand=["line_items", "line_items.data.price", "customer"]
        )

        print("✅ Session retrieved successfully\n")

        _print_session_basics(session)
        _print_metadata(session)
        _print_line_items(session)
        _print_subscription_info(session)
        _run_verification_checks(session)

        print(f"\n{'='*60}\n")

    except stripe.error.InvalidRequestError as e:
        print("❌ ERROR: Invalid session ID or session not found")
        print(f"   {str(e)}")
        print("\n💡 Tips:")
        print("   - Check that the session ID is correct")
        print("   - Ensure you're using the right Stripe account (test vs live)")
        print("   - Session IDs start with 'cs_test_' for test mode")

    except stripe.error.AuthenticationError as e:
        print("❌ ERROR: Stripe authentication failed")
        print(f"   {str(e)}")
        print("\n💡 Tips:")
        print("   - Check that STRIPE_SECRET_KEY is set correctly")
        print("   - Ensure the key starts with 'sk_test_' for test mode")

    except Exception as e:
        print("❌ ERROR: Unexpected error")
        print(f"   {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/scripts/test_stripe_session.py <session_id>")
        print("\nExample:")
        print("  python backend/scripts/test_stripe_session.py cs_test_xxxxxxxxxxxxx")
        sys.exit(1)

    session_id = sys.argv[1]
    test_session_retrieval(session_id)
