import logging
from datetime import date
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User, DeveloperPayout
from backend.utils import get_db

router = APIRouter(prefix="/api/developers", tags=["developers"])
logger = logging.getLogger(__name__)

class PayoutResponse(BaseModel):
    month: date
    gross_revenue: Decimal
    payout_status: str

    class Config:
        from_attributes = True

@router.get("/payouts", response_model=List[PayoutResponse])
def get_payout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payout history for the authenticated developer."""
    if not current_user.developer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Developer access required"
        )
        
    payouts = (
        db.query(DeveloperPayout)
        .filter(DeveloperPayout.dev_uid == current_user.uid)
        .order_by(DeveloperPayout.month.desc())
        .all()
    )
    return payouts

class DeveloperCreate(BaseModel):
    payout_method: dict
    payout_frequency: str = "monthly"

@router.post("/", status_code=status.HTTP_201_CREATED)
def register_developer(
    payload: DeveloperCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register as a developer. Requires Pro/Ultimate."""
    if current_user.developer:
        raise HTTPException(status_code=400, detail="Already a developer")
        
    active_subs = [s for s in current_user.subscriptions if s.status == "active"]
    has_pro = any(s.plan in ["pro", "ultimate"] for s in active_subs)
    if not has_pro:
         raise HTTPException(status_code=403, detail="Pro/Ultimate required")
         
    from backend.models.developer import Developer
    dev = Developer(
        uid=current_user.uid,
        payout_method=payload.payout_method,
        payout_frequency=payload.payout_frequency
    )
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return {"message": "Developer registered successfully"}
