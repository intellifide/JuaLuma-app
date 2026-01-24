# Core Purpose: Budget API endpoints for listing and creating budgets.
# Last Modified: 2026-01-23 23:05 CST
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Budget, User
from backend.services.household_service import get_household_member_uids
from backend.utils import get_db

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


class BudgetSchema(BaseModel):
    category: str
    amount: float
    period: str = "monthly"
    alert_enabled: bool = True
    alert_threshold_percent: float = 0.8


class BudgetResponse(BudgetSchema):
    id: str
    uid: str


@router.get("/", response_model=list[BudgetResponse])
def list_budgets(
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all budgets for the authenticated user."""
    if scope == "household":
        uids = get_household_member_uids(db, current_user.uid)
        stmt = select(Budget).where(Budget.uid.in_(uids))
    else:
        stmt = select(Budget).where(Budget.uid == current_user.uid)
    result = db.execute(stmt)
    return [
        BudgetResponse(
            id=str(row.id),
            uid=row.uid,
            category=row.category,
            amount=row.amount,
            period=row.period,
            alert_enabled=row.alert_enabled,
            alert_threshold_percent=row.alert_threshold_percent,
        )
        for row in result.scalars().all()
    ]


@router.post("/", response_model=BudgetResponse)
def upsert_budget(
    budget_in: BudgetSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Create or update a budget for a specific category."""
    # Check if exists
    stmt = select(Budget).where(
        Budget.uid == current_user.uid, Budget.category == budget_in.category
    )
    result = db.execute(stmt)
    existing_budget = result.scalars().first()

    if existing_budget:
        existing_budget.amount = budget_in.amount
        existing_budget.period = budget_in.period
        existing_budget.alert_enabled = budget_in.alert_enabled
        existing_budget.alert_threshold_percent = budget_in.alert_threshold_percent
        db.commit()
        db.refresh(existing_budget)
        return BudgetResponse(
            id=str(existing_budget.id),
            uid=existing_budget.uid,
            category=existing_budget.category,
            amount=existing_budget.amount,
            period=existing_budget.period,
            alert_enabled=existing_budget.alert_enabled,
            alert_threshold_percent=existing_budget.alert_threshold_percent,
        )
    else:
        new_budget = Budget(
            uid=current_user.uid,
            category=budget_in.category,
            amount=budget_in.amount,
            period=budget_in.period,
            alert_enabled=budget_in.alert_enabled,
            alert_threshold_percent=budget_in.alert_threshold_percent,
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return BudgetResponse(
            id=str(new_budget.id),
            uid=new_budget.uid,
            category=new_budget.category,
            amount=new_budget.amount,
            period=new_budget.period,
            alert_enabled=new_budget.alert_enabled,
            alert_threshold_percent=new_budget.alert_threshold_percent,
        )


@router.delete("/{category}")
def delete_budget(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a budget for a category."""
    stmt = select(Budget).where(
        Budget.uid == current_user.uid, Budget.category == category
    )
    result = db.execute(stmt)
    existing_budget = result.scalars().first()

    if not existing_budget:
        raise HTTPException(status_code=404, detail="No budget was found for the specified category.")

    db.delete(existing_budget)
    db.commit()
    return {"status": "deleted"}
