import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.core import settings
from backend.middleware.auth import (
    get_current_identity_with_user_guard,
    get_current_user,
)
from backend.models import PendingSignup, SubscriptionTier, User
from backend.services.billing import (
    _ensure_user_from_pending,
    create_checkout_session,
    create_checkout_session_for_pending,
    create_portal_session,
    update_user_tier,
)
from backend.utils import get_db

router = APIRouter(prefix="/api/billing", tags=["billing"])


class PortalRequest(BaseModel):
    return_url: str


class CheckoutRequest(BaseModel):
    plan_type: str
    return_url: str


class SubscriptionPlan(BaseModel):
    code: str
    name: str
    description: str | None
    price_id: str | None
    amount_cents: int
    currency: str
    interval: str
    features: list[str]


    model_config = ConfigDict(from_attributes=True)



@router.post("/portal")
async def create_portal(
    request: PortalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a Stripe Customer Portal session.
    """
    url = create_portal_session(user.uid, db, request.return_url)
    return {"url": url}


@router.post("/checkout/session")
async def create_checkout(
    request: CheckoutRequest,
    identity: dict = Depends(get_current_identity_with_user_guard),
    db: Session = Depends(get_db),
):
    """
    Creates a Stripe Checkout Session for a subscription.
    """
    uid = identity.get("uid")
    email = identity.get("email")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session data."
        )

    user = db.query(User).filter(User.uid == uid).first()
    if user:
        url = create_checkout_session(db, user.uid, request.plan_type, request.return_url)
        return {"url": url}

    pending = db.query(PendingSignup).filter(PendingSignup.uid == uid).first()
    if not pending and email:
        pending = db.query(PendingSignup).filter(PendingSignup.email == email).first()

    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signup session not found. Please restart signup.",
        )

    url = create_checkout_session_for_pending(
        db,
        pending.uid,
        pending.email,
        request.plan_type,
        request.return_url,
        customer_id=pending.stripe_customer_id,
    )
    db.commit()
    return {"url": url}


class SessionVerifyRequest(BaseModel):
    session_id: str


@router.post("/checkout/verify")
async def verify_checkout_session(
    request: SessionVerifyRequest,
    identity: dict = Depends(get_current_identity_with_user_guard),
    db: Session = Depends(get_db),
):
    """
    Manually verify a checkout session if webhooks are delayed (e.g. local dev).
    """
    from backend.services.billing import verify_stripe_session

    uid = identity.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session data."
        )

    success = verify_stripe_session(db, request.session_id)
    if not success:
        # It might just be not paid yet, or invalid
        return {"verified": False}

    # Query subscription separately to avoid lazy loading issues
    from backend.models import Subscription

    subscription = db.query(Subscription).filter(Subscription.uid == uid).first()
    plan = subscription.plan if subscription else "free"

    return {"verified": True, "plan": plan}


@router.get("/plans", response_model=list[SubscriptionPlan])
async def get_plans(db: Session = Depends(get_db)):
    """
    List all active subscription plans.
    """
    tiers = (
        db.query(SubscriptionTier).filter(SubscriptionTier.is_active.is_(True)).all()
    )
    return tiers


@router.post("/plans/free")
async def select_free_plan(
    identity: dict = Depends(get_current_identity_with_user_guard),
    db: Session = Depends(get_db),
):
    """
    Selects the Free plan and activates the user if they are in the pending plan selection state.
    """
    uid = identity.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session data."
        )

    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        user = _ensure_user_from_pending(db, uid)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signup session not found. Please restart signup.",
        )

    update_user_tier(db, user.uid, "free", status="active")
    return {"message": "Plan updated to Free", "plan": "free"}


@router.get("/invoices")
async def get_invoices(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Fetch the last 10 invoices for the user from Stripe.
    """
    if not settings.stripe_secret_key:
        # If Stripe isn't configured, return empty list instead of crashing
        return []

    from backend.models import Payment

    payment = db.query(Payment).filter(Payment.uid == user.uid).first()
    if not payment or not payment.stripe_customer_id:
        return []

    try:
        invoices = stripe.Invoice.list(
            customer=payment.stripe_customer_id, limit=100, status="paid"
        )
        data = []
        for inv in invoices.data:
            data.append(
                {
                    "id": inv.id,
                    "created": inv.created,  # timestamp
                    "amount_paid": inv.amount_paid,  # cents
                    "currency": inv.currency,
                    "status": inv.status,
                    "invoice_pdf": inv.invoice_pdf,
                    "number": inv.number,
                }
            )
        return data
    except stripe.error.StripeError:
        # Don't break the settings page if Stripe is down or errors
        # In a real app we might want to log this deeper or return partial error
        return []
