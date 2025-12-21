# Updated 2025-12-18 20:25 CST by Antigravity
import logging
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Account, Transaction, User
from backend.utils import get_db
from backend.utils.firestore import get_firestore_client

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


# Schemas
class DataPoint(BaseModel):
    date: date
    value: float


class NetWorthResponse(BaseModel):
    data: list[DataPoint]


class CashFlowResponse(BaseModel):
    income: list[DataPoint]
    expenses: list[DataPoint]


class CategorySpend(BaseModel):
    category: str
    amount: float


class SpendingByCategoryResponse(BaseModel):
    data: list[CategorySpend]


# Helper to generate date range
def _get_date_range(start_date: date, end_date: date, interval: str) -> list[date]:
    if start_date > end_date:
        return []

    dates = [start_date]
    current = start_date

    while current < end_date:
        if interval == "daily":
            next_date = current + timedelta(days=1)
        elif interval == "weekly":
            next_date = current + timedelta(weeks=1)
        elif interval == "monthly":
            # 2025-12-11 01:40 CST - ensure monthly buckets include the end date across year rollover
            target_year = current.year + 1 if current.month == 12 else current.year
            target_month = 1 if current.month == 12 else current.month + 1
            max_day = monthrange(target_year, target_month)[1]
            safe_day = min(current.day, max_day)
            next_date = date(target_year, target_month, safe_day)
        else:
            next_date = current + timedelta(days=1)

        if next_date >= end_date:
            if dates[-1] != end_date:
                dates.append(end_date)
            break

        dates.append(next_date)
        current = next_date

    return dates


def _get_cached_net_worth(db_fs, cache_key: str) -> NetWorthResponse | None:
    if not db_fs:
        return None
    try:
        doc_ref = db_fs.collection("analytics_cache").document(cache_key)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            if data.get("expires_at", 0) > datetime.now(UTC).timestamp():
                return NetWorthResponse(**data["payload"])
    except Exception as e:
        logger.warning(f"Firestore cache read failed: {e}")
    return None


def _calculate_balance_at_end(db: Session, uid: str, end_date: date) -> Decimal:
    accounts = db.query(Account).filter(Account.uid == uid).all()
    current_total = sum(((acc.balance or Decimal(0)) for acc in accounts), Decimal(0))

    recent_txns = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            Transaction.ts
            > datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
            Transaction.archived.is_(False),
        )
        .all()
    )
    future_delta = sum(((t.amount or Decimal(0)) for t in recent_txns), Decimal(0))
    return current_total - future_delta


def _generate_net_worth_series(
    dates: list[date], balance_at_end: Decimal, txns_in_range: list[Transaction]
) -> list[DataPoint]:
    res_list = []
    dates_desc = sorted(dates, reverse=True)
    running_balance = balance_at_end
    t_idx = 0

    for i, d in enumerate(dates_desc):
        res_list.append(DataPoint(date=d, value=float(running_balance)))

        if i + 1 < len(dates_desc):
            prev_date = dates_desc[i + 1]
            prev_d_end_dt = datetime.combine(
                prev_date, datetime.max.time(), tzinfo=UTC
            )

            period_delta = Decimal(0)
            while t_idx < len(txns_in_range):
                txn = txns_in_range[t_idx]
                if txn.ts > prev_d_end_dt:
                    period_delta += txn.amount
                    t_idx += 1
                else:
                    break
            running_balance -= period_delta

    res_list.reverse()
    return res_list


def _cache_result(db_fs, cache_key: str, uid: str, resp: NetWorthResponse):
    if not db_fs:
        return
    try:
        db_fs.collection("analytics_cache").document(cache_key).set(
            {
                "uid": uid,
                "payload": resp.model_dump(mode="json"),
                "expires_at": datetime.now(UTC).timestamp() + 3600,
            }
        )
    except Exception as e:
        logger.warning(f"Firestore cache write failed: {e}")


@router.get("/net-worth", response_model=NetWorthResponse)
def get_net_worth(
    start_date: date,
    end_date: date,
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cache_key = f"net_worth:{current_user.uid}:{start_date.isoformat()}:{end_date.isoformat()}:{interval}"
    db_fs = None
    try:
        db_fs = get_firestore_client()
    except Exception:
        pass  # Handle gracefully

    cached = _get_cached_net_worth(db_fs, cache_key)
    if cached:
        return cached

    dates = _get_date_range(start_date, end_date, interval)
    if not dates:
        return NetWorthResponse(data=[])

    balance_at_end = _calculate_balance_at_end(db, current_user.uid, end_date)

    all_txns_in_range = (
        db.query(Transaction)
        .filter(
            Transaction.uid == current_user.uid,
            Transaction.ts
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
            Transaction.ts
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC),
            Transaction.archived.is_(False),
        )
        .order_by(Transaction.ts.desc())
        .all()
    )

    series = _generate_net_worth_series(dates, balance_at_end, all_txns_in_range)
    resp = NetWorthResponse(data=series)

    _cache_result(db_fs, cache_key, current_user.uid, resp)
    return resp


@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(
    start_date: date,
    end_date: date,
    interval: str = Query("month", pattern="^(day|week|month)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 2025-12-18 20:30 CST - align date bounds with datetime combine for tz safety
    # Income
    income_query = (
        select(
            func.date_trunc(interval, Transaction.ts).label("period"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC),
            Transaction.ts
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
            Transaction.amount > 0,
            Transaction.archived.is_(False),
        )
        .group_by("period")
        .order_by("period")
    )

    # Expenses
    expense_query = (
        select(
            func.date_trunc(interval, Transaction.ts).label("period"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC),
            Transaction.ts
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
            Transaction.amount < 0,
            Transaction.archived.is_(False),
        )
        .group_by("period")
        .order_by("period")
    )

    income_res = db.execute(income_query).all()
    expense_res = db.execute(expense_query).all()

    income_data = [
        DataPoint(date=row.period.date(), value=float(row.total)) for row in income_res
    ]
    expense_data = [
        DataPoint(date=row.period.date(), value=float(row.total)) for row in expense_res
    ]

    return CashFlowResponse(income=income_data, expenses=expense_data)


@router.get("/spending-by-category", response_model=SpendingByCategoryResponse)
def get_spending_by_category(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 2025-12-11 14:05 CST - align date filtering with tz-aware datetimes
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=UTC)

    # Updated to pick up ALL categories (except explicit non-spending) regardless of sign
    # as some users might have mis-signed imports or positive 'expenses' (unusual but requested behavior).
    # We sum the ABS(amount) for magnitude of flow in that category.

    exclude_cats = [
        "Income",
        "Transfer",
        "Credit Card Payment",
        "Investment",
    ]  # Exclude non-spending

    query = (
        select(
            Transaction.category, func.sum(func.abs(Transaction.amount)).label("total")
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts >= start_dt,
            Transaction.ts <= end_dt,
            # Transaction.amount < 0, # REMOVED: Capture both signs
            Transaction.category.not_in(
                exclude_cats
            ),  # Exclude generic income/transfer types
            Transaction.archived.is_(False),
        )
        .group_by(Transaction.category)
    )

    res = db.execute(query).all()

    data = [
        CategorySpend(
            category=row.category or "Uncategorized", amount=abs(float(row.total))
        )
        for row in res
    ]
    data.sort(key=lambda x: x.amount, reverse=True)

    return SpendingByCategoryResponse(data=data)


__all__ = ["router"]
