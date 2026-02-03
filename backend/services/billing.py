# CORE PURPOSE: Service for handling Stripe billing, customer creation, checkout sessions, and webhooks.
# LAST MODIFIED: 2026-01-25 CST
import logging
from datetime import datetime, timedelta
from typing import Any

import stripe
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.core import settings
from backend.core.constants import UserStatus
from backend.models import AISettings, Payment, PendingSignup, Subscription, User
from backend.schemas.legal import AgreementAcceptancePayload
from backend.services.email import get_email_client
from backend.services.notifications import NotificationService
from backend.services.legal import record_agreement_acceptances

logger = logging.getLogger(__name__)

# Configure Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

# Updated 2026-01-25 CST
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

# Trial period configuration (in days) for each plan type
# Pro and Ultimate tiers include a 14-day free trial
TRIAL_PERIOD_DAYS = {
    "pro_monthly": 14,
    "pro_annual": 14,
    "ultimate_monthly": 14,
    "ultimate_annual": 14,
}

GRACE_PERIOD_DAYS = 3


def _normalize_plan_type(plan_type: str) -> str:
    normalized = plan_type.strip().lower()
    if normalized == "pro":
        return "pro_monthly"
    if normalized == "ultimate":
        return "ultimate_monthly"
    if normalized == "essential":
        return "essential_monthly"
    return normalized


def _format_date_for_email(value: datetime) -> str:
    return value.strftime("%B %d, %Y")


def _get_user(db: Session, uid: str) -> User | None:
    return db.query(User).filter(User.uid == uid).first()


def _get_user_email(db: Session, uid: str) -> str | None:
    user = _get_user(db, uid)
    return user.email if user else None


def _notify_subscription_update(
    db: Session, uid: str, title: str, message: str, dedupe_key: str
) -> None:
    user = _get_user(db, uid)
    if not user:
        return
    NotificationService(db).create_notification_for_event(
        user,
        "subscription_updates",
        title,
        message,
        dedupe_key=dedupe_key,
    )


def _send_payment_failed_email(
    db: Session, uid: str, plan_name: str, grace_end_date: datetime
) -> None:
    to_email = _get_user_email(db, uid)
    if not to_email:
        return
    _notify_subscription_update(
        db,
        uid,
        "Payment failed",
        f"Payment failed for your {plan_name} plan. Update your payment method by {_format_date_for_email(grace_end_date)}.",
        f"subscription_payment_failed:{uid}:{grace_end_date.date().isoformat()}",
    )
    client = get_email_client()
    client.send_subscription_payment_failed(
        to_email,
        plan_name,
        _format_date_for_email(grace_end_date),
    )


def _send_downgrade_email(db: Session, uid: str, reason: str) -> None:
    to_email = _get_user_email(db, uid)
    if not to_email:
        return
    _notify_subscription_update(
        db,
        uid,
        "Subscription downgraded",
        reason,
        f"subscription_downgraded:{uid}:{datetime.utcnow().date().isoformat()}",
    )
    client = get_email_client()
    client.send_subscription_downgraded(to_email, reason)


def _resolve_uid_for_customer(db: Session, customer_id: str | None) -> str | None:
    if not customer_id:
        return None
    payment = db.query(Payment).filter(Payment.stripe_customer_id == customer_id).first()
    if payment:
        return payment.uid
    pending = (
        db.query(PendingSignup)
        .filter(PendingSignup.stripe_customer_id == customer_id)
        .first()
    )
    return pending.uid if pending else None


def _ensure_user_from_pending(db: Session, uid: str) -> User | None:
    user = db.query(User).filter(User.uid == uid).first()
    if user:
        return user

    pending = db.query(PendingSignup).filter(PendingSignup.uid == uid).first()
    if not pending:
        return None

    user = User(
        uid=pending.uid,
        email=pending.email,
        role="user",
        status=UserStatus.PENDING_PLAN_SELECTION,
        theme_pref="glass",
        currency_pref="USD",
        first_name=pending.first_name,
        last_name=pending.last_name,
        username=pending.username,
        display_name_pref="name",
    )
    subscription = Subscription(uid=pending.uid, plan="free", status="active", ai_quota_used=0)
    ai_settings = AISettings(uid=pending.uid)

    try:
        db.add_all([user, subscription, ai_settings])
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        logger.error(
            "Failed to create user from pending signup.",
            extra={"uid": pending.uid, "email": pending.email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=409,
            detail="An account with this email address already exists.",
        ) from exc
    except Exception as exc:
        db.rollback()
        logger.error(
            "Failed to create user from pending signup.",
            extra={"uid": pending.uid, "email": pending.email},
            exc_info=exc,
        )
        raise HTTPException(
            status_code=500,
            detail="We encountered an issue creating your account. Please try again.",
        ) from exc

    if pending.stripe_customer_id:
        existing_payment = db.query(Payment).filter(Payment.uid == pending.uid).first()
        if not existing_payment:
            payment = Payment(uid=pending.uid, stripe_customer_id=pending.stripe_customer_id)
            db.add(payment)
            db.commit()

    if pending.agreements_json:
        try:
            acceptances = [
                AgreementAcceptancePayload(**agreement)
                for agreement in pending.agreements_json
            ]
            record_agreement_acceptances(
                db,
                uid=pending.uid,
                acceptances=acceptances,
                request=None,
                source="signup",
            )
        except Exception as exc:
            logger.error(
                "Failed to record agreement acceptances from pending signup.",
                extra={"uid": pending.uid},
                exc_info=exc,
            )

    db.delete(pending)
    db.commit()
    return user


def create_checkout_session_for_pending(
    uid: str,
    email: str,
    plan_type: str,
    return_url: str,
    *,
    customer_id: str | None = None,
) -> tuple[str, str]:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="The payment system is currently unavailable.")

    plan_type = _normalize_plan_type(plan_type)
    price_id = STRIPE_PLANS.get(plan_type)
    if not price_id:
        raise HTTPException(status_code=400, detail="The selected subscription plan is not recognized.")

    if not customer_id:
        customer = stripe.Customer.create(email=email, metadata={"uid": uid})
        customer_id = customer.id

    subscription_data = {"metadata": {"uid": uid, "plan": plan_type}}
    trial_days = TRIAL_PERIOD_DAYS.get(plan_type)
    if trial_days:
        subscription_data["trial_period_days"] = trial_days
        subscription_data["trial_settings"] = {
            "end_behavior": {"missing_payment_method": "cancel"}
        }
        logger.info(f"Creating checkout session with {trial_days}-day trial for plan {plan_type}")

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=return_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=return_url,
        allow_promotion_codes=True,
        metadata={"uid": uid, "plan": plan_type},
        subscription_data=subscription_data,
    )

    return session.url, customer_id


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
            status_code=500, detail="There was an error communicating with the payment provider. Please try again later."
        ) from e


def create_checkout_session(
    db: Session, uid: str, plan_type: str, return_url: str
) -> str:
    """
    Creates a Stripe Checkout Session for a subscription.
    Pro and Ultimate tiers include a 14-day free trial.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="The payment system is currently unavailable.")

    plan_type = _normalize_plan_type(plan_type)
    price_id = STRIPE_PLANS.get(plan_type)
    if not price_id:
        raise HTTPException(status_code=400, detail="The selected subscription plan is not recognized.")

    try:
        user = db.query(User).filter(User.uid == uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="The authenticated user profile could not be found.")

        customer_id = create_stripe_customer(db, uid, user.email)

        # Build subscription_data with trial period if applicable
        subscription_data = {"metadata": {"uid": uid, "plan": plan_type}}
        trial_days = TRIAL_PERIOD_DAYS.get(plan_type)
        if trial_days:
            subscription_data["trial_period_days"] = trial_days
            subscription_data["trial_settings"] = {
                "end_behavior": {"missing_payment_method": "cancel"}
            }
            logger.info(f"Creating checkout session with {trial_days}-day trial for plan {plan_type}")

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=return_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=return_url,
            allow_promotion_codes=True,
            metadata={"uid": uid, "plan": plan_type},
            subscription_data=subscription_data,
        )
        return session.url

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(
            status_code=500, detail="We encountered an issue while creating your checkout session. Please try again."
        ) from e


def _extract_session_metadata(session: Any) -> tuple[str | None, str | None]:
    """Helper to extract uid and plan_type from session metadata."""
    metadata = session.metadata or {}
    return metadata.get("uid"), metadata.get("plan")


def _recover_uid_from_customer(db: Session, session: Any) -> str | None:
    """Helper to recover user UID from Stripe customer ID if metadata is missing."""
    customer = session.customer
    if not customer:
        return None

    # Ensure customer is a string, not object (API v2020+)
    cust_id = customer.id if hasattr(customer, "id") else customer
    return _resolve_uid_for_customer(db, cust_id)


def _infer_plan_from_session(session: Any) -> str | None:
    """Helper to infer plan_type from session line items or subscription."""
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
        return STRIPE_PRICE_TO_TIER.get(price_id)
    return None


def _infer_plan_from_subscription(subscription: Any) -> str | None:
    try:
        items = subscription.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None
        if price_id:
            return STRIPE_PRICE_TO_TIER.get(price_id)
    except Exception:
        return None
    return None


def _normalize_tier(plan_type: str) -> str:
    """Normalize plan_type to an internal tier code."""
    tier = plan_type
    # If it somehow got mapped to a Price ID, reverse it
    if plan_type.startswith("price_"):
        tier = STRIPE_PRICE_TO_TIER.get(plan_type, "free")
    return tier


def verify_stripe_session(db: Session, session_id: str) -> bool:
    """
    Retrieve session from Stripe and update user if paid.
    Returns True if paid and updated, False otherwise.
    """
    if not settings.stripe_secret_key:
        logger.error("Stripe secret key not configured")
        return False

    try:
        # Expand line_items and customer to get all needed data
        session = stripe.checkout.Session.retrieve(
            session_id, expand=["line_items", "line_items.data.price", "customer"]
        )

        logger.info(
            f"Retrieved Stripe session {session_id}: payment_status={session.payment_status}"
        )

        if session.payment_status != "paid":
            if session.mode == "subscription" and session.subscription:
                subscription = stripe.Subscription.retrieve(session.subscription)
                if subscription.status not in ["trialing", "active"]:
                    return False
            else:
                return False

        uid, plan_type = _extract_session_metadata(session)

        # Fallback: if metadata is missing/incomplete, try to recover from Customer ID
        if not uid:
            uid = _recover_uid_from_customer(db, session)

        if not plan_type:
            plan_type = _infer_plan_from_session(session)

        if not uid or not plan_type:
            logger.error(
                f"Verify Session: Missing data - uid: {uid}, plan: {plan_type}"
            )
            return False

        _ensure_user_from_pending(db, uid)

        tier = _normalize_tier(plan_type)

        # Normalize for DB (ensure it exists)
        if tier not in STRIPE_PLANS and tier not in STRIPE_PRICE_TO_TIER.values():
            logger.error(f"Verify Session: Unknown tier code {tier}")
            return False

        update_user_tier(db, uid, tier, status="active")
        logger.info(f"Verify Session: Successfully updated {uid} to {tier}")
        return True

    except Exception as e:
        logger.error(f"Error verifying session {session_id}: {e}", exc_info=True)
        return False


def create_portal_session(user_id: str, db: Session, return_url: str) -> str:
    """
    Creates a Stripe Customer Portal session for the user.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="The payment system is currently unavailable.")

    user = db.query(User).filter(User.uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="The authenticated user profile could not be found.")

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
            status_code=500, detail="There was an error communicating with the payment provider. Please try again later."
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
                logger.info(
                    f"User {uid} already on {tier} ({status}). Skipping update."
                )
                user = db.query(User).filter(User.uid == uid).first()
                if user and user.status == UserStatus.PENDING_PLAN_SELECTION:
                    user.status = UserStatus.ACTIVE
                    db.add(user)
                    db.commit()
                return
            if not end_date:
                logger.info(
                    f"User {uid} already on {tier} ({status}). Skipping update."
                )
                user = db.query(User).filter(User.uid == uid).first()
                if user and user.status == UserStatus.PENDING_PLAN_SELECTION:
                    user.status = UserStatus.ACTIVE
                    db.add(user)
                    db.commit()
                return

        # Handle downgrade logic if moving from higher to lower
        if tier == "free" and sub.plan != "free":
            handle_downgrade_logic(db, uid)

        if sub.plan != tier:
            # Plan changed, reset welcome email flag so they get a new one on next login
            sub.welcome_email_sent = False

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

        # Welcome Email is now handled in Auth Login to prevent premature sending.
        # We assume welcome_email_sent=False on plan change above.

    logger.info(f"Updated user {uid} tier to {tier} ({status})")


def handle_downgrade_logic(db: Session, uid: str):
    """
    Specific logic when a user moves from Pro to Free.
    Allowed limits checks, etc. can be added here.
    """
    logger.info(f"Processing downgrade logic for user {uid}")
    # Example: Mark usage as archived or send notification
    pass


def cancel_user_subscription(db: Session, uid: str) -> bool:
    """
    Cancels the user's active Stripe subscription immediately.
    Used when a user joins a household and becomes a dependent.
    """
    if not settings.stripe_secret_key:
        logger.warning(
            "Stripe not configured. Skipping Stripe subscription cancellation."
        )
        return False

    payment = db.query(Payment).filter(Payment.uid == uid).first()
    if not payment or not payment.stripe_customer_id:
        logger.warning(f"No payment record found for user {uid}. Skipping cancellation.")
        return False

    try:
        # Find active subscriptions
        subs = stripe.Subscription.list(
            customer=payment.stripe_customer_id, status="active", limit=1
        )
        if subs.data:
            sub_id = subs.data[0].id
            stripe.Subscription.delete(sub_id)
            logger.info(
                f"canceled Stripe subscription {sub_id} for user {uid} (joining household)."
            )
            return True
        else:
            logger.info(f"No active Stripe subscription found for user {uid}.")
            return False

    except stripe.error.StripeError as e:
        logger.error(f"Error canceling subscription for user {uid}: {e}")
        # We don't raise here to avoid blocking the household join, but we log it.
        return False


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
    elif event_type == "invoice.payment_failed":
        await _handle_invoice_payment_failed(data_object, db)
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
    uid = _resolve_uid_for_customer(db, customer_id)
    if not uid:
        logger.warning(f"Webhook: No user found for customer {customer_id}")
        return

    _ensure_user_from_pending(db, uid)

    # Logic to extend subscription or reset quotas can go here
    # For now, just logging
    logger.info(f"Invoice paid for user {uid}")


async def _handle_invoice_payment_failed(invoice: dict[str, Any], db: Session):
    customer_id = invoice.get("customer")
    uid = _resolve_uid_for_customer(db, customer_id)
    if not uid:
        logger.warning(f"Webhook: No user found for customer {customer_id}")
        return

    _ensure_user_from_pending(db, uid)

    sub_id = invoice.get("subscription")
    subscription = stripe.Subscription.retrieve(sub_id) if sub_id else None
    plan_name = _infer_plan_from_subscription(subscription) if subscription else None

    now = datetime.utcnow()
    is_trial_ended = False
    trial_end_value = getattr(subscription, "trial_end", None) if subscription else None
    subscription_status = getattr(subscription, "status", None) if subscription else None
    if trial_end_value is not None:
        trial_end = datetime.utcfromtimestamp(trial_end_value)
        is_trial_ended = trial_end <= now and subscription_status in [
            "past_due",
            "incomplete",
            "incomplete_expired",
            "unpaid",
            "canceled",
        ]

    if is_trial_ended:
        update_user_tier(db, uid, "free", status="canceled", end_date=None)
        _send_downgrade_email(
            db,
            uid,
            "Trial period ended and payment could not be processed.",
        )
        logger.info(f"Webhook: Trial ended with failed payment. Downgraded {uid} to free.")
        return

    sub_record = db.query(Subscription).filter(Subscription.uid == uid).first()
    if sub_record and sub_record.status == "past_due" and sub_record.renew_at:
        grace_end = sub_record.renew_at
    else:
        grace_end = now + timedelta(days=GRACE_PERIOD_DAYS)
        update_user_tier(
            db,
            uid,
            plan_name or (sub_record.plan if sub_record else "free"),
            status="past_due",
            end_date=grace_end,
        )
        _send_payment_failed_email(
            db,
            uid,
            plan_name or (sub_record.plan if sub_record else "paid plan"),
            grace_end,
        )
        logger.info(
            f"Webhook: Payment failed. Grace period until {grace_end.isoformat()} for {uid}."
        )

    if grace_end <= now:
        update_user_tier(db, uid, "free", status="canceled", end_date=None)
        _send_downgrade_email(
            db,
            uid,
            "Payment failed and the 3-day grace period has ended.",
        )
        logger.info(f"Webhook: Grace expired. Downgraded {uid} to free.")


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

    uid = _resolve_uid_for_customer(db, customer_id)
    if not uid:
        logger.warning(f"Webhook: No user found for customer {customer_id}")
        return

    _ensure_user_from_pending(db, uid)

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
            update_user_tier(db, uid, paid_plan, status, renew_at)
            _notify_subscription_update(
                db,
                uid,
                "Subscription updated",
                f"Your subscription is now {paid_plan.title()} ({status}).",
                f"subscription_updated:{uid}:{paid_plan}:{status}:{(renew_at.date().isoformat() if renew_at else 'none')}",
            )
        else:
            # Active but unknown price? Fallback to free or log error.
            # This might happen if we didn't map the price ID correctly.
            logger.error(f"Webhook: Active subscription for unknown price {price_id}")
            update_user_tier(db, uid, "free", status, renew_at)
            _notify_subscription_update(
                db,
                uid,
                "Subscription updated",
                "Your subscription status changed, but the plan could not be identified. Please contact support if this seems wrong.",
                f"subscription_updated:{uid}:unknown:{status}:{(renew_at.date().isoformat() if renew_at else 'none')}",
            )
    elif status in ["past_due", "unpaid"]:
        sub_record = db.query(Subscription).filter(Subscription.uid == uid).first()
        now = datetime.utcnow()
        if sub_record and sub_record.status == "past_due" and sub_record.renew_at:
            grace_end = sub_record.renew_at
        else:
            grace_end = now + timedelta(days=GRACE_PERIOD_DAYS)
            update_user_tier(
                db,
                uid,
                paid_plan or (sub_record.plan if sub_record else "free"),
                status="past_due",
                end_date=grace_end,
            )
            _send_payment_failed_email(
                db,
                uid,
                paid_plan or (sub_record.plan if sub_record else "paid plan"),
                grace_end,
            )
            logger.info(
                f"Webhook: Subscription {status}. Grace period until {grace_end.isoformat()} for {uid}."
            )

        if grace_end <= now:
            logger.info(
                f"Webhook: Subscription {status} with expired grace. Downgrading {uid}."
            )
            update_user_tier(db, uid, "free", status="canceled", end_date=None)
            handle_downgrade_logic(db, uid)
            _send_downgrade_email(
                db,
                uid,
                "Payment failed and the 3-day grace period has ended.",
            )
    else:
        # Not active (canceled, incomplete_expired, etc.)
        logger.info(f"Webhook: Subscription status {status} - downgrading to free")
        update_user_tier(db, uid, "free", status, None)
        handle_downgrade_logic(db, uid)
        _send_downgrade_email(
            db,
            uid,
            "Your subscription was canceled or expired.",
        )


async def _handle_subscription_deleted(subscription: dict[str, Any], db: Session):
    customer_id = subscription.get("customer")
    uid = _resolve_uid_for_customer(db, customer_id)
    if not uid:
        return

    _ensure_user_from_pending(db, uid)

    # Subscription deleted means access is revoked immediately
    logger.info("Webhook: Subscription deleted - downgrading to free")
    update_user_tier(db, uid, "free", "canceled", None)
    handle_downgrade_logic(db, uid)
    _notify_subscription_update(
        db,
        uid,
        "Subscription canceled",
        "Your subscription was canceled and your plan has been moved to Free.",
        f"subscription_deleted:{uid}:{datetime.utcnow().date().isoformat()}",
    )


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
        uid = _resolve_uid_for_customer(db, customer_id)
        if not uid:
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
        _ensure_user_from_pending(db, uid)
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
            _notify_subscription_update(
                db,
                uid,
                "Subscription activated",
                f"Your subscription is now active on the {tier.title()} plan.",
                f"subscription_activated:{uid}:{tier}:{datetime.utcnow().date().isoformat()}",
            )
        else:
            logger.warning(
                f"Webhook: Unknown plan type {plan_type} in checkout metadata."
            )
