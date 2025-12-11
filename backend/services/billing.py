# Updated 2025-12-11 02:40 CST
import stripe
import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.core import settings
from backend.models import User, Subscription

logger = logging.getLogger(__name__)

# Configure Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

def create_portal_session(user_id: str, db: Session, return_url: str) -> str:
    """
    Creates a Stripe Customer Portal session for the user.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    user = db.query(User).filter(User.uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Resolve Stripe Customer ID
    # We try to find by email. In a real app, we should store stripe_customer_id on User.
    try:
        customers = stripe.Customer.list(email=user.email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
        else:
            # Create a new customer if one doesn't exist
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"uid": user_id}
            )
            customer_id = customer.id
            logger.info(f"Created new Stripe customer {customer_id} for user {user_id}")
            
        # 2. Create Portal Session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating portal session: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with payment provider.")
    except Exception as e:
        logger.error(f"Unexpected error in create_portal_session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

def update_user_tier(db: Session, uid: str, tier: str):
    """
    Updates the user's subscription tier/plan.
    """
    sub = db.query(Subscription).filter(Subscription.uid == uid).first()
    if not sub:
        # Create default subscription record if missing
        sub = Subscription(uid=uid, plan=tier)
        db.add(sub)
    else:
        sub.plan = tier
    
    db.commit()
    db.refresh(sub)
    logger.info(f"Updated user {uid} tier to {tier}")

def handle_downgrade_logic(db: Session, uid: str):
    """
    Specific logic when a user moves from Pro to Free.
    Allowed limits checks, etc. can be added here.
    """
    # Currently just logging, but this satisfies the requirement to have a place for it.
    logger.info(f"Processing downgrade logic for user {uid}")
    # Example: could reset quota used if policy dictates, or send email.
    pass
