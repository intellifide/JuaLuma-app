
import logging
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from typing import List

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
    data: List[DataPoint]

class CashFlowResponse(BaseModel):
    income: List[DataPoint]
    expenses: List[DataPoint]

class CategorySpend(BaseModel):
    category: str
    amount: float

class SpendingByCategoryResponse(BaseModel):
    data: List[CategorySpend]

# Helper to generate date range
def _get_date_range(start_date: date, end_date: date, interval: str) -> List[date]:
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        if interval == 'daily':
            current += timedelta(days=1)
        elif interval == 'weekly':
            current += timedelta(weeks=1)
        elif interval == 'monthly':
            # naive monthly increment
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        else:
             current += timedelta(days=1)
    return dates

@router.get("/net-worth", response_model=NetWorthResponse)
def get_net_worth(
    start_date: date,
    end_date: date,
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Cache key
    # Simple formatting for cache key
    cache_key = f"net_worth:{current_user.uid}:{start_date.isoformat()}:{end_date.isoformat()}:{interval}"
    
    try:
        db_fs = get_firestore_client()
        doc_ref = db_fs.collection("analytics_cache").document(cache_key)
        
        # Try cache
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            # check expiry
            if data.get("expires_at", 0) > datetime.now(timezone.utc).timestamp():
                 return NetWorthResponse(**data["payload"])
    except Exception as e:
        logger.warning(f"Firestore cache read failed: {e}")
        db_fs = None # Prevent write later if init failed

    # Calculate
    # 1. Get current balance of all accounts
    accounts = db.query(Account).filter(Account.uid == current_user.uid).all()
    current_total = sum(acc.balance or Decimal(0) for acc in accounts)

    # 2. Get all transactions > start_date
    all_txns = db.query(Transaction).filter(
        Transaction.uid == current_user.uid,
        Transaction.ts >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
        Transaction.archived.is_(False) 
    ).order_by(Transaction.ts.desc()).all()

    dates = _get_date_range(start_date, end_date, interval)
    if not dates:
        return NetWorthResponse(data=[])

    # 3. Calculate Balance(end_date)
    # Get transactions AFTER end_date to find Balance at end_date
    recent_txns = db.query(Transaction).filter(
        Transaction.uid == current_user.uid,
        Transaction.ts > datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc),
        Transaction.archived.is_(False)
    ).all()
    
    balance_at_end = current_total - sum(t.amount for t in recent_txns)
    
    # 4. Filter transactions for the range and sort desc
    txns_in_range = [t for t in all_txns if t.ts <= datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)]
    txns_in_range.sort(key=lambda x: x.ts, reverse=True)
    
    # 5. Populate buckets
    res_list = []
    dates_desc = sorted(dates, reverse=True)
    
    t_idx = 0
    running_balance = balance_at_end 
    
    for i, d in enumerate(dates_desc):
        # Store current running balance for this date
        res_list.append(DataPoint(date=d, value=float(running_balance)))
        
        # Prepare for next date (move backwards in time)
        if i + 1 < len(dates_desc):
            prev_date = dates_desc[i+1]
            
            # d_end_dt = datetime.combine(d, datetime.max.time(), tzinfo=timezone.utc)
            prev_d_end_dt = datetime.combine(prev_date, datetime.max.time(), tzinfo=timezone.utc)
            
            # Consume transactions in window (prev_d_end_dt, d_end_dt]
            # Since txns_in_range are sorted desc (newest first), we iterate
            period_delta = Decimal(0)
            while t_idx < len(txns_in_range):
                txn = txns_in_range[t_idx]
                if txn.ts > prev_d_end_dt:
                    period_delta += txn.amount
                    t_idx += 1
                else:
                    break
            
            # Move balance backwards: Bal(prev) = Bal(curr) - Delta
            running_balance -= period_delta

    res_list.reverse()
    
    resp = NetWorthResponse(data=res_list)
    
    # Cache write
    if db_fs:
        try:
            doc_ref.set({
                "payload": resp.model_dump(mode='json'),
                "expires_at": datetime.now(timezone.utc).timestamp() + 3600
            })
        except Exception as e:
            logger.warning(f"Firestore cache write failed: {e}")

    return resp

@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Income
    income_query = (
        select(
            func.date_trunc('month', Transaction.ts).label("month"),
            func.sum(Transaction.amount).label("total")
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts >= start_date,
            Transaction.ts <= end_date,
            Transaction.amount > 0,
            Transaction.archived.is_(False)
        )
        .group_by("month")
        .order_by("month")
    )
    
    # Expenses
    expense_query = (
        select(
            func.date_trunc('month', Transaction.ts).label("month"),
            func.sum(Transaction.amount).label("total")
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts >= start_date,
            Transaction.ts <= end_date,
            Transaction.amount < 0,
            Transaction.archived.is_(False)
        )
        .group_by("month")
        .order_by("month")
    )
    
    income_res = db.execute(income_query).all()
    expense_res = db.execute(expense_query).all()
    
    income_data = [DataPoint(date=row.month.date(), value=float(row.total)) for row in income_res]
    expense_data = [DataPoint(date=row.month.date(), value=float(row.total)) for row in expense_res]
    
    return CashFlowResponse(income=income_data, expenses=expense_data)

@router.get("/spending-by-category", response_model=SpendingByCategoryResponse)
def get_spending_by_category(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total")
        )
        .where(
            Transaction.uid == current_user.uid,
            Transaction.ts >= start_date,
            Transaction.ts <= end_date,
            Transaction.amount < 0,
            Transaction.archived.is_(False)
        )
        .group_by(Transaction.category)
    )
    
    res = db.execute(query).all()
    
    data = [
        CategorySpend(
            category=row.category or "Uncategorized", 
            amount=abs(float(row.total))
        ) 
        for row in res
    ]
    data.sort(key=lambda x: x.amount, reverse=True)
    
    return SpendingByCategoryResponse(data=data)

__all__ = ["router"]
