from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import SubscriptionTier, User
from backend.services.billing import (
    create_checkout_session,
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

    class Config:
        from_attributes = True


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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a Stripe Checkout Session for a subscription.
    """
    url = create_checkout_session(db, user.uid, request.plan_type, request.return_url)
    return {"url": url}


class SessionVerifyRequest(BaseModel):
    session_id: str


@router.post("/checkout/verify")
async def verify_checkout_session(
    request: SessionVerifyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually verify a checkout session if webhooks are delayed (e.g. local dev).
    """
    from backend.services.billing import verify_stripe_session

    success = verify_stripe_session(db, request.session_id)
    if not success:
        # It might just be not paid yet, or invalid
        return {"verified": False}

    # Query subscription separately to avoid lazy loading issues
    from backend.models import Subscription

    subscription = db.query(Subscription).filter(Subscription.uid == user.uid).first()
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
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Selects the Free plan and activates the user if they are in the pending plan selection state.
    """
    update_user_tier(db, user.uid, "free", status="active")
    return {"message": "Plan updated to Free", "plan": "free"}
