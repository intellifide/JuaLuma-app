# Core Purpose: Budget API endpoints for listing and creating budgets.
# Last Modified: 2026-02-03
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Budget, HouseholdMember, Transaction, User
from backend.services.household_service import get_household_member_uids
from backend.utils import get_db

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

BudgetPeriod = Literal["monthly", "quarterly", "annual"]


def _to_cents(value: float | Decimal) -> int:
    # Budget amounts are stored as float today; convert via str to avoid float artifacts.
    dec = value if isinstance(value, Decimal) else Decimal(str(value))
    return int((dec * 100).quantize(Decimal("1")))


def _resolve_to_date_window(period: str, today: date) -> tuple[date, date]:
    normalized = (period or "monthly").lower()
    if normalized == "annual":
        return date(today.year, 1, 1), today
    if normalized == "quarterly":
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        return date(today.year, quarter_start_month, 1), today
    # monthly default
    return date(today.year, today.month, 1), today


def _resolve_completed_buckets(
    period: str, today: date, *, lookback: int
) -> list[tuple[str, date, date]]:
    normalized = (period or "monthly").lower()
    if lookback <= 0:
        return []

    buckets: list[tuple[str, date, date]] = []

    def end_of_month(d: date) -> date:
        if d.month == 12:
            next_month = date(d.year + 1, 1, 1)
        else:
            next_month = date(d.year, d.month + 1, 1)
        return next_month - timedelta(days=1)

    # We build buckets as fully completed periods, excluding the current in-progress one.
    if normalized == "annual":
        year = today.year - 1
        for _ in range(lookback):
            start = date(year, 1, 1)
            end = date(year, 12, 31)
            buckets.append((str(year), start, end))
            year -= 1
        return buckets

    if normalized == "quarterly":
        # Determine previous quarter.
        q = ((today.month - 1) // 3) + 1
        year = today.year
        q -= 1
        if q == 0:
            q = 4
            year -= 1
        for _ in range(lookback):
            start_month = (q - 1) * 3 + 1
            start = date(year, start_month, 1)
            # end month is start_month+2
            end_month = start_month + 2
            end = end_of_month(date(year, end_month, 1))
            buckets.append((f"{year}-Q{q}", start, end))
            q -= 1
            if q == 0:
                q = 4
                year -= 1
        return buckets

    # monthly default: last completed N months
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1
    for _ in range(lookback):
        start = date(year, month, 1)
        end = end_of_month(start)
        buckets.append((f"{year}-{month:02d}", start, end))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return buckets


def _scope_context(
    db: Session, current_user: User, scope: str
) -> tuple[str, list[str], bool]:
    """
    Returns (budget_owner_uid, spend_uids, can_edit).

    - personal: budgets + spending are for current_user.
    - household: budgets are owned by the household admin; spending is aggregated across members.
      Only household admins can edit household budgets.
    """
    if scope == "personal":
        return current_user.uid, [current_user.uid], True

    member = db.query(HouseholdMember).filter(HouseholdMember.uid == current_user.uid).first()
    if not member or not member.can_view_household:
        raise HTTPException(status_code=403, detail="You do not have access to household budgets.")

    admin_uid_row = (
        db.query(HouseholdMember.uid)
        .filter(
            HouseholdMember.household_id == member.household_id,
            HouseholdMember.role == "admin",
        )
        .first()
    )
    admin_uid = admin_uid_row[0] if admin_uid_row else current_user.uid
    spend_uids = get_household_member_uids(db, current_user.uid)
    can_edit = member.role == "admin"
    return admin_uid, spend_uids, can_edit


def _calculate_spend_by_category(
    db: Session, *, uids: list[str], start: date, end: date, categories: list[str]
) -> dict[str, int]:
    if not categories:
        return {}
    start_dt = datetime.combine(start, datetime.min.time(), tzinfo=UTC)
    end_dt = datetime.combine(end, datetime.max.time(), tzinfo=UTC)

    rows = (
        db.query(
            Transaction.category,
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.amount < 0, -Transaction.amount),
                        else_=0,
                    )
                ),
                0,
            ).label("spent"),
        )
        .filter(
            Transaction.uid.in_(uids),
            Transaction.archived.is_(False),
            Transaction.category.in_(categories),
            Transaction.ts >= start_dt,
            Transaction.ts <= end_dt,
        )
        .group_by(Transaction.category)
        .all()
    )

    spend: dict[str, int] = {}
    for category, spent_val in rows:
        if not category:
            continue
        spend[str(category)] = _to_cents(spent_val or Decimal("0"))
    return spend


class BudgetSchema(BaseModel):
    category: str
    amount: float
    period: str = "monthly"
    alert_enabled: bool = True
    alert_threshold_percent: float = 0.8


class BudgetResponse(BudgetSchema):
    id: str
    uid: str


class BudgetStatusItem(BaseModel):
    category: str
    period: BudgetPeriod
    window_start: date
    window_end: date
    budget_amount: float
    spent: float
    delta: float
    percent_used: float
    status: Literal["under", "at", "over"]


class BudgetStatusResponse(BaseModel):
    scope: Literal["personal", "household"]
    budget_owner_uid: str
    spend_uids: list[str]
    items: list[BudgetStatusItem]
    total_budget: float
    total_spent: float
    percent_used: float
    counts: dict[str, int]


class BudgetHistoryBucket(BaseModel):
    key: str
    start: date
    end: date
    total_budget: float
    total_spent: float
    percent_used: float
    counts: dict[str, int]


class BudgetHistoryResponse(BaseModel):
    scope: Literal["personal", "household"]
    budget_owner_uid: str
    spend_uids: list[str]
    period: BudgetPeriod
    buckets: list[BudgetHistoryBucket]


class BulkPeriodRequest(BaseModel):
    period: BudgetPeriod


class BulkPeriodResponse(BaseModel):
    status: str
    updated: int


@router.get("/", response_model=list[BudgetResponse])
def list_budgets(
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all budgets for the authenticated user."""
    budget_owner_uid, _spend_uids, _can_edit = _scope_context(db, current_user, scope)
    stmt = select(Budget).where(Budget.uid == budget_owner_uid)
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


@router.get("/status", response_model=BudgetStatusResponse)
def get_budget_status(
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    budget_owner_uid, spend_uids, _can_edit = _scope_context(db, current_user, scope)
    budgets = db.query(Budget).filter(Budget.uid == budget_owner_uid).all()
    if not budgets:
        return BudgetStatusResponse(
            scope=scope,  # type: ignore[arg-type]
            budget_owner_uid=budget_owner_uid,
            spend_uids=spend_uids,
            items=[],
            total_budget=0.0,
            total_spent=0.0,
            percent_used=0.0,
            counts={"under": 0, "at": 0, "over": 0},
        )

    today = datetime.now(UTC).date()
    budgets_by_period: dict[str, list[Budget]] = {}
    for b in budgets:
        period = (b.period or "monthly").lower()
        if period not in ("monthly", "quarterly", "annual"):
            period = "monthly"
        budgets_by_period.setdefault(period, []).append(b)

    items: list[BudgetStatusItem] = []
    total_budget_cents = 0
    total_spent_cents = 0
    counts = {"under": 0, "at": 0, "over": 0}

    for period, period_budgets in budgets_by_period.items():
        window_start, window_end = _resolve_to_date_window(period, today)
        categories = [b.category for b in period_budgets]
        spend_cents_by_category = _calculate_spend_by_category(
            db, uids=spend_uids, start=window_start, end=window_end, categories=categories
        )

        for b in period_budgets:
            budget_cents = _to_cents(b.amount)
            spent_cents = spend_cents_by_category.get(b.category, 0)
            total_budget_cents += max(0, budget_cents)
            total_spent_cents += max(0, spent_cents)

            if spent_cents < budget_cents:
                status = "under"
            elif spent_cents == budget_cents:
                status = "at"
            else:
                status = "over"
            counts[status] += 1

            percent_used = 0.0 if budget_cents <= 0 else min(100.0, (spent_cents / budget_cents) * 100.0)

            items.append(
                BudgetStatusItem(
                    category=b.category,
                    period=period,  # type: ignore[arg-type]
                    window_start=window_start,
                    window_end=window_end,
                    budget_amount=float(b.amount),
                    spent=float(Decimal(spent_cents) / 100),
                    delta=float(Decimal(spent_cents - budget_cents) / 100),
                    percent_used=percent_used,
                    status=status,  # type: ignore[arg-type]
                )
            )

    overall_percent = 0.0 if total_budget_cents <= 0 else min(100.0, (total_spent_cents / total_budget_cents) * 100.0)
    return BudgetStatusResponse(
        scope=scope,  # type: ignore[arg-type]
        budget_owner_uid=budget_owner_uid,
        spend_uids=spend_uids,
        items=sorted(items, key=lambda item: item.category),
        total_budget=float(Decimal(total_budget_cents) / 100),
        total_spent=float(Decimal(total_spent_cents) / 100),
        percent_used=overall_percent,
        counts=counts,
    )


@router.get("/history", response_model=BudgetHistoryResponse)
def get_budget_history(
    period: str = Query("monthly", pattern="^(monthly|quarterly|annual)$"),
    lookback: int = Query(6, ge=1, le=24),
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    budget_owner_uid, spend_uids, _can_edit = _scope_context(db, current_user, scope)
    normalized = (period or "monthly").lower()
    if normalized not in ("monthly", "quarterly", "annual"):
        normalized = "monthly"

    budgets = (
        db.query(Budget)
        .filter(Budget.uid == budget_owner_uid, Budget.period == normalized)
        .all()
    )
    today = datetime.now(UTC).date()
    buckets = _resolve_completed_buckets(normalized, today, lookback=lookback)
    if not budgets or not buckets:
        return BudgetHistoryResponse(
            scope=scope,  # type: ignore[arg-type]
            budget_owner_uid=budget_owner_uid,
            spend_uids=spend_uids,
            period=normalized,  # type: ignore[arg-type]
            buckets=[],
        )

    categories = [b.category for b in budgets]
    budget_cents_by_category = {b.category: _to_cents(b.amount) for b in budgets}

    bucket_responses: list[BudgetHistoryBucket] = []
    for key, start, end in buckets:
        spend_cents_by_category = _calculate_spend_by_category(
            db, uids=spend_uids, start=start, end=end, categories=categories
        )
        total_budget_cents = 0
        total_spent_cents = 0
        counts = {"under": 0, "at": 0, "over": 0}
        for cat in categories:
            budget_cents = budget_cents_by_category.get(cat, 0)
            spent_cents = spend_cents_by_category.get(cat, 0)
            total_budget_cents += max(0, budget_cents)
            total_spent_cents += max(0, spent_cents)
            if spent_cents < budget_cents:
                counts["under"] += 1
            elif spent_cents == budget_cents:
                counts["at"] += 1
            else:
                counts["over"] += 1

        percent_used = 0.0 if total_budget_cents <= 0 else min(100.0, (total_spent_cents / total_budget_cents) * 100.0)
        bucket_responses.append(
            BudgetHistoryBucket(
                key=key,
                start=start,
                end=end,
                total_budget=float(Decimal(total_budget_cents) / 100),
                total_spent=float(Decimal(total_spent_cents) / 100),
                percent_used=percent_used,
                counts=counts,
            )
        )

    return BudgetHistoryResponse(
        scope=scope,  # type: ignore[arg-type]
        budget_owner_uid=budget_owner_uid,
        spend_uids=spend_uids,
        period=normalized,  # type: ignore[arg-type]
        buckets=bucket_responses,
    )


@router.post("/", response_model=BudgetResponse)
def upsert_budget(
    budget_in: BudgetSchema,
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Create or update a budget for a specific category."""
    period = (budget_in.period or "monthly").lower()
    if period not in ("monthly", "quarterly", "annual"):
        raise HTTPException(status_code=422, detail="Invalid budget period. Use monthly, quarterly, or annual.")

    budget_owner_uid, _spend_uids, can_edit = _scope_context(db, current_user, scope)
    if scope == "household" and not can_edit:
        raise HTTPException(status_code=403, detail="Only household admins can edit household budgets.")

    # Check if exists
    stmt = select(Budget).where(
        Budget.uid == budget_owner_uid, Budget.category == budget_in.category
    )
    result = db.execute(stmt)
    existing_budget = result.scalars().first()

    if existing_budget:
        existing_budget.amount = budget_in.amount
        existing_budget.period = period
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
            uid=budget_owner_uid,
            category=budget_in.category,
            amount=budget_in.amount,
            period=period,
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

@router.put("/bulk-period", response_model=BulkPeriodResponse)
def bulk_set_budget_period(
    body: BulkPeriodRequest,
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    budget_owner_uid, _spend_uids, can_edit = _scope_context(db, current_user, scope)
    if scope == "household" and not can_edit:
        raise HTTPException(status_code=403, detail="Only household admins can edit household budgets.")

    result = (
        db.query(Budget)
        .filter(Budget.uid == budget_owner_uid)
        .update({Budget.period: body.period}, synchronize_session=False)
    )
    db.commit()
    return BulkPeriodResponse(status="ok", updated=int(result or 0))


@router.delete("/{category}")
def delete_budget(
    category: str,
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a budget for a category."""
    budget_owner_uid, _spend_uids, can_edit = _scope_context(db, current_user, scope)
    if scope == "household" and not can_edit:
        raise HTTPException(status_code=403, detail="Only household admins can edit household budgets.")

    stmt = select(Budget).where(
        Budget.uid == budget_owner_uid, Budget.category == category
    )
    result = db.execute(stmt)
    existing_budget = result.scalars().first()

    if not existing_budget:
        raise HTTPException(status_code=404, detail="No budget was found for the specified category.")

    db.delete(existing_budget)
    db.commit()
    return {"status": "deleted"}


@router.delete("/")
def reset_budgets(
    scope: str = Query("personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Delete all budgets for the authenticated user."""
    budget_owner_uid, _spend_uids, can_edit = _scope_context(db, current_user, scope)
    if scope == "household" and not can_edit:
        raise HTTPException(status_code=403, detail="Only household admins can edit household budgets.")

    stmt = select(Budget).where(Budget.uid == budget_owner_uid)
    result = db.execute(stmt)
    budgets_to_delete = result.scalars().all()

    for b in budgets_to_delete:
        db.delete(b)

    db.commit()
    return {"status": "all budgets reset"}
