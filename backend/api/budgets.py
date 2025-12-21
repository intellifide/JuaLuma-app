from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Budget, User
from backend.utils import get_db

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


class BudgetSchema(BaseModel):
    category: str
    amount: float
    period: str = "monthly"


class BudgetResponse(BudgetSchema):
    id: str


@router.get("/", response_model=list[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all budgets for the authenticated user."""
    stmt = select(Budget).where(Budget.uid == current_user.uid)
    result = db.execute(stmt)
    return [
        BudgetResponse(
            id=str(row.id), category=row.category, amount=row.amount, period=row.period
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
        db.commit()
        db.refresh(existing_budget)
        return BudgetResponse(
            id=str(existing_budget.id),
            category=existing_budget.category,
            amount=existing_budget.amount,
            period=existing_budget.period,
        )
    else:
        new_budget = Budget(
            uid=current_user.uid,
            category=budget_in.category,
            amount=budget_in.amount,
            period=budget_in.period,
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return BudgetResponse(
            id=str(new_budget.id),
            category=new_budget.category,
            amount=new_budget.amount,
            period=new_budget.period,
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
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(existing_budget)
    db.commit()
    return {"status": "deleted"}
