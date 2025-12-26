# Updated 2025-12-26 21:00 CST by Antigravity
import logging
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User
from backend.services import analytics as analytics_service
from backend.services.analytics import (
    CashFlowResponse,
    NetWorthResponse,
    SpendingByCategoryResponse,
)
from backend.utils import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


@router.get("/net-worth", response_model=NetWorthResponse)
def get_net_worth(
    start_date: date,
    end_date: date,
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return analytics_service.get_net_worth(
        db, current_user.uid, start_date, end_date, interval, scope
    )


@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(
    start_date: date,
    end_date: date,
    interval: str = Query("month", pattern="^(day|week|month)$"),
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return analytics_service.get_cash_flow(
        db, current_user.uid, start_date, end_date, interval, scope
    )


@router.get("/spending-by-category", response_model=SpendingByCategoryResponse)
def get_spending_by_category(
    start_date: date,
    end_date: date,
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return analytics_service.get_spending_by_category(
        db, current_user.uid, start_date, end_date, scope
    )


__all__ = ["router"]
