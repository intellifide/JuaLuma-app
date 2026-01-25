# Core Purpose: Analytics aggregation and caching helpers for dashboard insights.
# Last Modified: 2026-01-25 13:30 CST
import logging
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from backend.models import Account, Transaction, User
from backend.services.household_service import get_household_member_uids
from backend.utils.firestore import get_firestore_client
from sqlalchemy import or_

logger = logging.getLogger(__name__)

# Schemas (duplicated here or moved here to be used by service return types)
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

def invalidate_analytics_cache(uid: str):
    """
    Invalidate all analytics cache entries for a specific user.
    """
    try:
        db_fs = get_firestore_client()
        if not db_fs:
            return

        # Query all documents in 'analytics_cache' where 'uid' == uid
        docs = db_fs.collection("analytics_cache").where("uid", "==", uid).stream()

        batch = db_fs.batch()
        count = 0
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            # Firestore batches are limited to 500 ops
            if count >= 400:
                batch.commit()
                batch = db_fs.batch()
                count = 0

        if count > 0:
            batch.commit()

        logger.info(f"Invalidated analytics cache for user {uid}")

    except Exception as e:
        logger.warning(f"Failed to invalidate analytics cache for user {uid}: {e}")

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


def _apply_transaction_filters(
    query,
    *,
    account_type: str | None = None,
    exclude_account_types: list[str] | None = None,
    category: str | None = None,
    is_manual: bool | None = None,
):
    """Apply transaction filters to a query, including account type filtering."""
    if account_type or exclude_account_types:
        # Join with Account table to filter by account_type
        query = query.join(Account, Transaction.account_id == Account.id)
        if account_type:
            query = query.filter(Account.account_type == account_type)
        if exclude_account_types:
            query = query.filter(~Account.account_type.in_(exclude_account_types))
    if category:
        query = query.filter(Transaction.category == category)
    if is_manual is not None:
        query = query.filter(Transaction.is_manual == is_manual)
    return query


def _get_cash_flow_periods(start_date: date, end_date: date, interval: str) -> list[date]:
    """Build a complete cash flow timeline so empty periods return zero values."""
    if start_date > end_date:
        return []

    if interval == "day":
        total_days = (end_date - start_date).days
        return [start_date + timedelta(days=offset) for offset in range(total_days + 1)]

    if interval == "week":
        # Align weeks to Sunday to match date_trunc('week') + interval '6 days'.
        start_week_start = start_date - timedelta(days=start_date.weekday())
        end_week_start = end_date - timedelta(days=end_date.weekday())
        current = start_week_start + timedelta(days=6)
        last = end_week_start + timedelta(days=6)
        periods = []
        while current <= last:
            periods.append(current)
            current += timedelta(days=7)
        return periods

    if interval == "month":
        # Align to first day of month to match date_trunc('month').
        current = date(start_date.year, start_date.month, 1)
        last = date(end_date.year, end_date.month, 1)
        periods = []
        while current <= last:
            periods.append(current)
            next_year = current.year + (1 if current.month == 12 else 0)
            next_month = 1 if current.month == 12 else current.month + 1
            current = date(next_year, next_month, 1)
        return periods

    return []

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

def _calculate_balance_at_end(db: Session, uids: list[str], end_date: date) -> Decimal:
    accounts = db.query(Account).filter(Account.uid.in_(uids)).all()
    current_total = sum(((acc.balance or Decimal(0)) for acc in accounts), Decimal(0))

    recent_txns = (
        db.query(Transaction)
        .filter(
            Transaction.uid.in_(uids),
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
            prev_d_end_dt = datetime.combine(prev_date, datetime.max.time(), tzinfo=UTC)

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

def get_net_worth(
    db: Session,
    uid: str,
    start_date: date,
    end_date: date,
    interval: str,
    scope: str = "personal",
    account_type: str | None = None,
    exclude_account_types: list[str] | None = None,
    category: str | None = None,
    is_manual: bool | None = None,
) -> NetWorthResponse:
    cache_key = (
        f"net_worth:{uid}:{start_date.isoformat()}:{end_date.isoformat()}:{interval}:{scope}"
    )
    db_fs = None
    try:
        db_fs = get_firestore_client()
    except Exception:
        pass

    cached = _get_cached_net_worth(db_fs, cache_key)
    if cached:
        return cached

    dates = _get_date_range(start_date, end_date, interval)
    if not dates:
        return NetWorthResponse(data=[])

    target_uids = [uid]
    if scope == "household":
        target_uids = get_household_member_uids(db, uid)

    balance_at_end = _calculate_balance_at_end(db, target_uids, end_date)

    query = (
        db.query(Transaction)
        .filter(
            Transaction.uid.in_(target_uids),
            Transaction.ts
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
            Transaction.ts
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC),
            Transaction.archived.is_(False),
        )
    )
    
    # Apply transaction filters
    query = _apply_transaction_filters(
        query,
        account_type=account_type,
        exclude_account_types=exclude_account_types,
        category=category,
        is_manual=is_manual,
    )
    
    all_txns_in_range = query.order_by(Transaction.ts.desc()).all()

    series = _generate_net_worth_series(dates, balance_at_end, all_txns_in_range)
    resp = NetWorthResponse(data=series)

    _cache_result(db_fs, cache_key, uid, resp)
    return resp

def get_cash_flow(
    db: Session,
    uid: str,
    start_date: date,
    end_date: date,
    interval: str,
    scope: str = "personal",
    account_type: str | None = None,
    exclude_account_types: list[str] | None = None,
    category: str | None = None,
    is_manual: bool | None = None,
) -> CashFlowResponse:
    """Aggregate cash flow into ordered periods and include empty buckets."""
    target_uids = [uid]
    if scope == "household":
        target_uids = get_household_member_uids(db, uid)

    base_ts = func.timezone("UTC", Transaction.ts)
    if interval == "week":
        period_expr = func.date_trunc("week", base_ts) + text("interval '6 days'")
    else:
        period_expr = func.date_trunc(interval, base_ts)

    # Build base filter conditions
    base_filters = [
        Transaction.uid.in_(target_uids),
        Transaction.ts >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC),
        Transaction.ts <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC),
        Transaction.archived.is_(False),
    ]
    
    # Apply account type filters if needed
    if account_type or exclude_account_types:
        base_filters.append(Transaction.account_id.in_(
            select(Account.id).where(
                *([Account.account_type == account_type] if account_type else []),
                *([~Account.account_type.in_(exclude_account_types)] if exclude_account_types else [])
            )
        ))
    
    if category:
        base_filters.append(Transaction.category == category)
    if is_manual is not None:
        base_filters.append(Transaction.is_manual == is_manual)

    # Income
    income_query = (
        select(
            period_expr.label("period"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            *base_filters,
            Transaction.amount > 0,
        )
        .group_by("period")
        .order_by("period")
    )

    # Expenses
    expense_query = (
        select(
            period_expr.label("period"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            *base_filters,
            Transaction.amount < 0,
        )
        .group_by("period")
        .order_by("period")
    )

    income_res = db.execute(income_query).all()
    expense_res = db.execute(expense_query).all()

    income_by_period = {row.period.date(): float(row.total) for row in income_res}
    expense_by_period = {row.period.date(): float(row.total) for row in expense_res}
    periods = _get_cash_flow_periods(start_date, end_date, interval)

    # Build aligned series so charts can render zero-value periods.
    income_data = [
        DataPoint(date=period, value=income_by_period.get(period, 0.0))
        for period in periods
    ]
    expense_data = [
        DataPoint(date=period, value=expense_by_period.get(period, 0.0))
        for period in periods
    ]

    return CashFlowResponse(income=income_data, expenses=expense_data)

def get_spending_by_category(
    db: Session,
    uid: str,
    start_date: date,
    end_date: date,
    scope: str = "personal",
    account_type: str | None = None,
    exclude_account_types: list[str] | None = None,
    category: str | None = None,
    is_manual: bool | None = None,
) -> SpendingByCategoryResponse:
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=UTC)

    target_uids = [uid]
    if scope == "household":
        target_uids = get_household_member_uids(db, uid)

    exclude_cats = [
        "Income",
        "Transfer",
        "Credit Card Payment",
        "Investment",
    ]

    # Build base filter conditions
    base_filters = [
        Transaction.uid.in_(target_uids),
        Transaction.ts >= start_dt,
        Transaction.ts <= end_dt,
        Transaction.category.not_in(exclude_cats),
        Transaction.archived.is_(False),
    ]
    
    # Apply account type filters if needed
    if account_type or exclude_account_types:
        base_filters.append(Transaction.account_id.in_(
            select(Account.id).where(
                *([Account.account_type == account_type] if account_type else []),
                *([~Account.account_type.in_(exclude_account_types)] if exclude_account_types else [])
            )
        ))
    
    if category:
        base_filters.append(Transaction.category == category)
    if is_manual is not None:
        base_filters.append(Transaction.is_manual == is_manual)

    query = (
        select(
            Transaction.category, func.sum(func.abs(Transaction.amount)).label("total")
        )
        .where(*base_filters)
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
