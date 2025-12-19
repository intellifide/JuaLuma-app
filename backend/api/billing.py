from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.utils import get_db
from backend.services.billing import create_portal_session, create_checkout_session, update_user_tier
from backend.middleware.auth import get_current_user
from backend.models import User

router = APIRouter(prefix="/api/billing", tags=["billing"])

class PortalRequest(BaseModel):
    return_url: str

class CheckoutRequest(BaseModel):
    plan_type: str
    return_url: str

@router.post("/portal")
async def create_portal(
    request: PortalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe Checkout Session for a subscription.
    """
    url = create_checkout_session(db, user.uid, request.plan_type, request.return_url)
    return {"url": url}

@router.post("/plans/free")
async def select_free_plan(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Selects the Free plan and activates the user if they are in the pending plan selection state.
    """
    update_user_tier(db, user.uid, "free", status="active")
    return {"message": "Plan updated to Free", "plan": "free"}
