# Updated 2026-01-25 13:30 CST
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
    account_type: str | None = Query(default=None, description="Filter by account type (e.g., 'web3', 'cex', 'traditional')"),
    exclude_account_types: str | None = Query(default=None, description="Comma-separated list of account types to exclude (e.g., 'web3,cex')"),
    category: str | None = Query(default=None, description="Filter by transaction category"),
    is_manual: bool | None = Query(default=None, description="Filter by manual transactions (true) or automated (false)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exclude_types_list = None
    if exclude_account_types:
        exclude_types_list = [t.strip() for t in exclude_account_types.split(",") if t.strip()]

    return analytics_service.get_net_worth(
        db, current_user.uid, start_date, end_date, interval, scope,
        account_type=account_type,
        exclude_account_types=exclude_types_list,
        category=category,
        is_manual=is_manual,
    )


@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(
    start_date: date,
    end_date: date,
    interval: str = Query("month", pattern="^(day|week|month)$"),
    scope: str = Query("personal", pattern="^(personal|household)$"),
    account_type: str | None = Query(default=None, description="Filter by account type (e.g., 'web3', 'cex', 'traditional')"),
    exclude_account_types: str | None = Query(default=None, description="Comma-separated list of account types to exclude (e.g., 'web3,cex')"),
    category: str | None = Query(default=None, description="Filter by transaction category"),
    is_manual: bool | None = Query(default=None, description="Filter by manual transactions (true) or automated (false)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exclude_types_list = None
    if exclude_account_types:
        exclude_types_list = [t.strip() for t in exclude_account_types.split(",") if t.strip()]

    return analytics_service.get_cash_flow(
        db, current_user.uid, start_date, end_date, interval, scope,
        account_type=account_type,
        exclude_account_types=exclude_types_list,
        category=category,
        is_manual=is_manual,
    )


@router.get("/spending-by-category", response_model=SpendingByCategoryResponse)
def get_spending_by_category(
    start_date: date,
    end_date: date,
    scope: str = Query("personal", pattern="^(personal|household)$"),
    account_type: str | None = Query(default=None, description="Filter by account type (e.g., 'web3', 'cex', 'traditional')"),
    exclude_account_types: str | None = Query(default=None, description="Comma-separated list of account types to exclude (e.g., 'web3,cex')"),
    category: str | None = Query(default=None, description="Filter by transaction category"),
    is_manual: bool | None = Query(default=None, description="Filter by manual transactions (true) or automated (false)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exclude_types_list = None
    if exclude_account_types:
        exclude_types_list = [t.strip() for t in exclude_account_types.split(",") if t.strip()]

    return analytics_service.get_spending_by_category(
        db, current_user.uid, start_date, end_date, scope,
        account_type=account_type,
        exclude_account_types=exclude_types_list,
        category=category,
        is_manual=is_manual,
    )


__all__ = ["router"]
