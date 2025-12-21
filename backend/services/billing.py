# Updated 2025-12-19 02:30 CST
import logging
from datetime import datetime
from typing import Any

import stripe
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.core import settings
from backend.core.constants import UserStatus
from backend.models import Payment, Subscription, User

logger = logging.getLogger(__name__)

# Configure Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

# Updated 2025-12-19 02:40 CST
# Replace with actual Stripe Price IDs from your Stripe Dashboard
STRIPE_PLANS = {
    "essential_monthly": "price_1SftXDRQfRSwy2AaP2V5zy32",
    "pro_monthly": "price_1SftXERQfRSwy2AaoWXBD9Q7",
    "pro_annual": "price_1SftXERQfRSwy2Aa84D0XrhT",
    "ultimate_monthly": "price_1SftXFRQfRSwy2Aas3bHnACi",
    "ultimate_annual": "price_1SftXFRQfRSwy2AapSGEb9HA",
}

# Map Price IDs to the exact database code in SubscriptionTier table
STRIPE_PRICE_TO_TIER = {
    "price_1SftXDRQfRSwy2AaP2V5zy32": "essential_monthly",
    "price_1SftXERQfRSwy2AaoWXBD9Q7": "pro_monthly",
    "price_1SftXERQfRSwy2Aa84D0XrhT": "pro_annual",
    "price_1SftXFRQfRSwy2Aas3bHnACi": "ultimate_monthly",
    "price_1SftXFRQfRSwy2AapSGEb9HA": "ultimate_annual",
}

# Keeping this for legacy compatibility or reverse lookups if needed, but preferable to use above.
STRIPE_PRICE_TO_PLAN = STRIPE_PRICE_TO_TIER


def create_stripe_customer(db: Session, uid: str, email: str) -> str:
    """
    Creates a Stripe Customer for the user if one doesn't exist.
    Stores the stripe_customer_id in the Payment model.
    """
    if not settings.stripe_secret_key:
        logger.warning("Stripe is not configured. Skipping customer creation.")
        return "mock_cus_id"

    # Check if Payment record exists
    payment_record = db.query(Payment).filter(Payment.uid == uid).first()
    if payment_record and payment_record.stripe_customer_id:
        return payment_record.stripe_customer_id

    try:
        # Search by email first to avoid duplicates
        customers = stripe.Customer.list(email=email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
            logger.info(f"Found existing Stripe customer {customer_id} for {email}")
        else:
            customer = stripe.Customer.create(email=email, metadata={"uid": uid})
            customer_id = customer.id
            logger.info(f"Created new Stripe customer {customer_id} for user {uid}")

        # Store in Payment table
        if not payment_record:
            payment_record = Payment(uid=uid, stripe_customer_id=customer_id)
            db.add(payment_record)
        else:
            payment_record.stripe_customer_id = customer_id

        db.commit()
        db.refresh(payment_record)
        return customer_id

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {e}")
        # Validate if we should raise or return None. For sign-up flow, maybe log and continue?
        # But if this is called explicitly, we might want to raise.
        raise HTTPException(
            status_code=500, detail="Error communicating with payment provider."
        ) from e


def create_checkout_session(
    db: Session, uid: str, plan_type: str, return_url: str
) -> str:
    """
    Creates a Stripe Checkout Session for a subscription.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    price_id = STRIPE_PLANS.get(plan_type)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan type.")

    try:
        user = db.query(User).filter(User.uid == uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        customer_id = create_stripe_customer(db, uid, user.email)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=return_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=return_url,
            allow_promotion_codes=True,
            metadata={"uid": uid, "plan": plan_type},
        )
        return session.url

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Error creating checkout session.") from e


def verify_stripe_session(db: Session, session_id: str) -> bool:
    """
    Retrieve session from Stripe and update user if paid.
    Returns True if paid and updated, False otherwise.
    """
    if not settings.stripe_secret_key:
        return False

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
             customer = session.customer
             uid = session.metadata.get("uid")
             plan_type = session.metadata.get("plan")
             
             # Fallback: if metadata is missing/incomplete, try to recover from Customer ID
             if not uid and customer:
                 # Ensure customer is a string, not object (API v2020+)
                 cust_id = customer.id if hasattr(customer, "id") else customer
                 payment = db.query(Payment).filter(Payment.stripe_customer_id == cust_id).first()
                 if payment:
                     uid = payment.uid
             
             if not plan_type:
                 # Try to infer plan from line items if metadata failed (rare)
                 # We need to expand line_items in retrieve if not present
                 if session.line_items:
                     price_id = session.line_items.data[0].price.id
                 else:
                     # Check subscription item
                     sub_id = session.subscription
                     if sub_id:
                         # Retrieve sub to get price
                         sub_obj = stripe.Subscription.retrieve(sub_id)
                         price_id = sub_obj["items"]["data"][0]["price"]["id"]
                     else:
                         price_id = None
                 
                 if price_id:
                     # Reverse lookup plan_type/tier from price_id
                     plan_type = STRIPE_PRICE_TO_TIER.get(price_id)

             if uid and plan_type:
                 # Map 'essential_monthly' (if key) or raw price ID to tier code
                 # Our internal tiers use keys like 'essential_monthly', 'pro_monthly'
                 # 'plan_type' from metadata matches keys in STRIPE_PLANS
                 
                 # If plan_type is actually a Tier Code (e.g. 'essential_monthly')
                 tier = plan_type
                 
                 # If it somehow got mapped to a Price ID, reverse it
                 if plan_type.startswith("price_"):
                     tier = STRIPE_PRICE_TO_TIER.get(plan_type, "free")

                 # Normalize for DB (ensure it exists)
                 # We trust update_user_tier to handle it, but let's be safe
                 if tier not in STRIPE_PLANS and tier not in STRIPE_PRICE_TO_TIER.values():
                     logger.warning(f"Verify Session: Unknown tier code {tier}. Defaulting to free.")
                     return False

                 update_user_tier(db, uid, tier, status="active")
                 logger.info(f"Verify Session: Successfully updated {uid} to {tier}")
                 return True
                 
        return False
    except Exception as e:
        logger.error(f"Error verifying session {session_id}: {e}")
        # In a real debug scenario, we might want to propagate this, but for now log it.
        return False


def create_portal_session(user_id: str, db: Session, return_url: str) -> str:
    """
    Creates a Stripe Customer Portal session for the user.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    user = db.query(User).filter(User.uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        customer_id = create_stripe_customer(db, user_id, user.email)

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating portal session: {e}")
        raise HTTPException(
            status_code=500, detail="Error communicating with payment provider."
        ) from e


def update_user_tier(
    db: Session, uid: str, tier: str, status: str = "active", end_date: datetime = None
):
    """
    Updates the user's subscription tier/plan.
    """
    sub = db.query(Subscription).filter(Subscription.uid == uid).first()
    if not sub:
        # Create default subscription record if missing
        sub = Subscription(uid=uid, plan=tier, status=status)
        db.add(sub)
    else:
        # Idempotency Check: if already in desired state, skip write
        # This handles the race condition between Webhook and Manual Verify
        if sub.plan == tier and sub.status == status:
             if end_date and sub.renew_at == end_date:
                  logger.info(f"User {uid} already on {tier} ({status}). Skipping update.")
                  return
             if not end_date:
                  logger.info(f"User {uid} already on {tier} ({status}). Skipping update.")
                  return

        # Handle downgrade logic if moving from higher to lower
        if tier == "free" and sub.plan != "free":
            handle_downgrade_logic(db, uid)

        sub.plan = tier
        sub.status = status
        if end_date:
            sub.renew_at = end_date

    db.commit()
    db.refresh(sub)

    # Ensure user status is active if they have a valid plan
    user = db.query(User).filter(User.uid == uid).first()
    if user and user.status == UserStatus.PENDING_PLAN_SELECTION:
        user.status = UserStatus.ACTIVE
        db.add(user)
        db.commit()
        logger.info(f"User {uid} transitioned to ACTIVE status.")

    logger.info(f"Updated user {uid} tier to {tier} ({status})")


def handle_downgrade_logic(db: Session, uid: str):
    """
    Specific logic when a user moves from Pro to Free.
    Allowed limits checks, etc. can be added here.
    """
    logger.info(f"Processing downgrade logic for user {uid}")
    # Example: Mark usage as archived or send notification
    pass


async def handle_stripe_webhook(payload: bytes, sig_header: str, db: Session):
    """
    Handles incoming Stripe webhooks.
    """
    if not settings.stripe_webhook_secret:
        # Use configured secret or fallback to None which will fail validation if not set
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError as e:
        logger.error(f"Webhook error: Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload") from e
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook error: Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature") from e

    event_type = event["type"]
    data_object = event["data"]["object"]

    logger.info(f"Received Stripe webhook: {event_type}")

    if event_type == "invoice.payment_succeeded":
        await _handle_invoice_paid(data_object, db)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(data_object, db)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data_object, db)
    elif event_type == "checkout.session.completed":
        await _handle_checkout_session_completed(data_object, db)

    return {"status": "success"}


async def _handle_invoice_paid(invoice: dict[str, Any], db: Session):
    customer_id = invoice.get("customer")
    # Find user by customer_id (Need to query Payment table)
    # Since Payment table is new, we need to ensure we have it hooked up.
    # For now, let's look up via Payment table
    payment = (
        db.query(Payment).filter(Payment.stripe_customer_id == customer_id).first()
    )
    if not payment:
        logger.warning(f"Webhook: No user found for customer {customer_id}")
        return

    # Logic to extend subscription or reset quotas can go here
    # For now, just logging
    logger.info(f"Invoice paid for user {payment.uid}")


async def _handle_subscription_updated(subscription: dict[str, Any], db: Session):
    customer_id = subscription.get("customer")
    status = subscription.get("status")
    current_period_end = subscription.get("current_period_end")

    items = subscription.get("items", {}).get("data", [])
    price_id = items[0]["price"]["id"] if items else None

    # Identify the paid plan associated with this webhook
    # STRIPE_PRICE_TO_PLAN is now aliased to STRIPE_PRICE_TO_TIER, so this works,
    # but let's be explicit and strictly use the tier map.
    paid_plan = STRIPE_PRICE_TO_TIER.get(price_id)

    payment = (
        db.query(Payment).filter(Payment.stripe_customer_id == customer_id).first()
    )
    if not payment:
        logger.warning(f"Webhook: No user found for customer {customer_id}")
        return

    renew_at = (
        datetime.fromtimestamp(current_period_end) if current_period_end else None
    )

    # Logic:
    # 1. If status is NOT 'active' or 'trialing', treat as effectively free/expired immediately
    #    (unless past_due grace period logic is desired, but let's be strict as requested).
    # 2. If active but cancel_at_period_end is True, they stay on the paid plan until renew_at.
    # 3. If active and NOT canceling, they are on the paid plan.

    if status in ["active", "trialing"]:
        # User has a valid paid session
        if paid_plan:
            # They should be on this plan
            update_user_tier(db, payment.uid, paid_plan, status, renew_at)
        else:
            # Active but unknown price? Fallback to free or log error.
            # This might happen if we didn't map the price ID correctly.
            logger.error(f"Webhook: Active subscription for unknown price {price_id}")
            update_user_tier(db, payment.uid, "free", status, renew_at)
    else:
        # Not active (canceled, unpaid, incomplete_expired, etc.)
        # Immediate downgrade
        logger.info(f"Webhook: Subscription status {status} - downgrading to free")
        update_user_tier(db, payment.uid, "free", status, None)
        handle_downgrade_logic(db, payment.uid)


async def _handle_subscription_deleted(subscription: dict[str, Any], db: Session):
    customer_id = subscription.get("customer")
    payment = (
        db.query(Payment).filter(Payment.stripe_customer_id == customer_id).first()
    )
    if not payment:
        return

    # Subscription deleted means access is revoked immediately
    logger.info("Webhook: Subscription deleted - downgrading to free")
    update_user_tier(db, payment.uid, "free", "canceled", None)
    handle_downgrade_logic(db, payment.uid)


async def _handle_checkout_session_completed(session: dict[str, Any], db: Session):
    """
    Handles successful checkout session.
    Transitions user from PENDING_PLAN_SELECTION (or Free) to the paid plan.
    """
    customer_id = session.get("customer")
    metadata = session.get("metadata", {})
    uid = metadata.get("uid")
    plan_type = metadata.get("plan")

    if not uid:
        # Try to find by customer_id
        payment = (
            db.query(Payment).filter(Payment.stripe_customer_id == customer_id).first()
        )
        if payment:
            uid = payment.uid
        else:
            logger.warning(
                f"Webhook: Checkout completed but no UID found in metadata or payment record. Customer: {customer_id}"
            )
            return

    logger.info(f"Webhook: Checkout session completed for user {uid}, plan {plan_type}")

    # If we have a subscription ID in the session, we can fetch details,
    # but the subscription.updated webhook will likely follow and handle details (renew_at, etc).
    # However, we should explicitly set the state here to ensure immediate access.

    # Check if we have subscription info in the session object

    if plan_type:
        # Map the plan string (e.g. 'pro_monthly') to the tier (e.g. 'pro')
        # We need a reverse lookup or just checking the string structure.
        # STRIPE_PLANS maps 'pro_monthly' -> price_ID
        # STRIPE_PRICE_TO_TIER maps price_ID -> 'pro'
        # So:
        price_id = STRIPE_PLANS.get(plan_type)
        tier = STRIPE_PRICE_TO_TIER.get(price_id, "free")

        if tier:
            update_user_tier(db, uid, tier, status="active")
            logger.info(f"Webhook: User {uid} activated on {tier} via checkout.")
        else:
            logger.warning(
                f"Webhook: Unknown plan type {plan_type} in checkout metadata."
            )
