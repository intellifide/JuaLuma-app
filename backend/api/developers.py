import logging
from datetime import date
from decimal import Decimal
from typing import List, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.core.dependencies import require_developer, require_pro_or_ultimate
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

class PaginatedPayoutResponse(BaseModel):
    data: List[PayoutResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)

@router.get("/payouts", response_model=List[PayoutResponse])
def get_payout_history(
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
) -> List[DeveloperPayout]:
    """Get payout history for the authenticated developer."""
        
    payouts = (
        db.query(DeveloperPayout)
        .filter(DeveloperPayout.dev_uid == current_user.uid)
        .order_by(DeveloperPayout.month.desc())
        .all()
    )
    return payouts

@router.get("/transactions", response_model=PaginatedPayoutResponse)
def get_developer_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get paginated developer transactions (payouts)."""
    query = (
        db.query(DeveloperPayout)
        .filter(DeveloperPayout.dev_uid == current_user.uid)
        .order_by(DeveloperPayout.month.desc())
    )
    
    total = query.count()
    payouts = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "data": payouts,
        "total": total,
        "page": page,
        "page_size": page_size
    }

class DeveloperCreate(BaseModel):
    payout_method: Dict[str, Any]
    payout_frequency: str = "monthly"

@router.post("/", status_code=status.HTTP_201_CREATED)
def register_developer(
    payload: DeveloperCreate,
    current_user: User = Depends(require_pro_or_ultimate),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Register as a developer. Requires Pro/Ultimate."""
    if current_user.developer:
        raise HTTPException(status_code=400, detail="Already a developer")
         
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
