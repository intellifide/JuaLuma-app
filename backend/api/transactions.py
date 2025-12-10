"""Transaction API endpoints."""

# Updated 2025-12-08 21:27 CST by ChatGPT

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import AuditLog, Transaction, User
from backend.utils import get_db


router = APIRouter(prefix="/api/transactions", tags=["transactions"])


# Pydantic schemas
class TransactionResponse(BaseModel):
    id: uuid.UUID
    ts: datetime
    amount: Decimal
    currency: str
    category: Optional[str] = None
    merchant_name: Optional[str] = None
    description: Optional[str] = None
    account_id: uuid.UUID
    external_id: Optional[str] = None
    is_manual: bool
    archived: bool
    raw_json: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionUpdate(BaseModel):
    category: Optional[str] = Field(default=None, max_length=64)
    description: Optional[str] = Field(default=None, max_length=512)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "TransactionUpdate":
        if self.category is None and self.description is None:
            raise ValueError("Provide at least one field to update.")
        return self


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class BulkUpdateRequest(BaseModel):
    transaction_ids: list[uuid.UUID] = Field(
        min_length=1, description="List of transaction IDs to update."
    )
    updates: TransactionUpdate


def _paginate(query, page: int, page_size: int):
    total = query.count()
    items = (
        query.order_by(Transaction.ts.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return total, items


def _apply_filters(
    db_query,
    *,
    account_id: Optional[uuid.UUID],
    category: Optional[str],
    start_date: Optional[date],
    end_date: Optional[date],
):
    if account_id:
        db_query = db_query.filter(Transaction.account_id == account_id)
    if category:
        db_query = db_query.filter(Transaction.category == category)
    if start_date:
        db_query = db_query.filter(
            Transaction.ts
            >= datetime.combine(
                start_date, datetime.min.time(), tzinfo=timezone.utc
            )
        )
    if end_date:
        db_query = db_query.filter(
            Transaction.ts
            <= datetime.combine(
                end_date, datetime.max.time(), tzinfo=timezone.utc
            )
        )
    return db_query


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    account_id: Optional[uuid.UUID] = Query(default=None),
    category: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    search: Optional[str] = Query(default=None, description="Search merchant or description."),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    """
    List current user's transactions with filters and pagination.

    - **account_id**: Filter by account.
    - **category**: Filter by category.
    - **search**: Search merchant or description.
    - **page / page_size**: Pagination control.

    Returns paginated list of transactions.
    """
    query = db.query(Transaction).filter(
        Transaction.uid == current_user.uid,
        Transaction.archived.is_(False),
    )
    query = _apply_filters(query, account_id=account_id, category=category, start_date=start_date, end_date=end_date)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Transaction.merchant_name.ilike(pattern), Transaction.description.ilike(pattern))
        )

    total, items = _paginate(query, page, page_size)
    return TransactionListResponse(
        transactions=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionResponse:
    """
    Return a single transaction with raw data.

    - **transaction_id**: UUID of the transaction.
    """
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.uid == current_user.uid)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )
    return txn


@router.patch("/bulk")
def bulk_update_transactions(
    payload: BulkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Bulk update transactions in a single DB transaction.

    - **transaction_ids**: List of IDs to update.
    - **updates**: Fields to update (category, description).

    Restricted to user's own transactions.
    """
    txn_ids = set(payload.transaction_ids)
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.id.in_(txn_ids),
            Transaction.uid == current_user.uid,
        )
        .all()
    )

    if len(txns) != len(txn_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or more transactions are missing or not owned by the user.",
        )

    for txn in txns:
        if payload.updates.category is not None:
            txn.category = payload.updates.category
        if payload.updates.description is not None:
            txn.description = payload.updates.description
        db.add(txn)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_bulk_edit",
        source="backend",
        metadata_json={
            "transaction_ids": [str(t.id) for t in txns],
            "updates": payload.updates.model_dump(exclude_none=True),
        },
    )
    db.add(audit)
    db.commit()
    return {"updated_count": len(txns)}


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionResponse:
    """Update category/description for a transaction."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.uid == current_user.uid)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )

    old_category = txn.category
    old_description = txn.description

    if payload.category is not None:
        txn.category = payload.category
    if payload.description is not None:
        txn.description = payload.description

    db.add(txn)
    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_edit",
        source="backend",
        metadata_json={
            "transaction_id": str(txn.id),
            "old_category": old_category,
            "new_category": txn.category,
            "old_description": old_description,
            "new_description": txn.description,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Soft delete a manual transaction."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.uid == current_user.uid)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )
    if not txn.is_manual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only manual transactions can be deleted.",
        )

    txn.archived = True
    db.add(txn)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_deleted",
        source="backend",
        metadata_json={"transaction_id": str(txn.id), "is_manual": txn.is_manual},
    )
    db.add(audit)
    db.commit()

    return {"message": "Transaction deleted"}


@router.get("/search", response_model=TransactionListResponse)
def search_transactions(
    q: str = Query(min_length=1, description="Search term"),
    account_id: Optional[uuid.UUID] = Query(default=None),
    category: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    """Search transactions using PostgreSQL full-text search."""
    query = db.query(Transaction).filter(
        Transaction.uid == current_user.uid,
        Transaction.archived.is_(False),
    )
    query = _apply_filters(query, account_id=account_id, category=category, start_date=start_date, end_date=end_date)

    ts_vector = func.to_tsvector(
        "english",
        func.concat_ws(
            " ",
            func.coalesce(Transaction.merchant_name, ""),
            func.coalesce(Transaction.description, ""),
        ),
    )
    ts_query = func.plainto_tsquery("english", q)
    query = query.filter(ts_vector.op("@@")(ts_query))

    total, items = _paginate(query, page, page_size)
    return TransactionListResponse(
        transactions=items,
        total=total,
        page=page,
        page_size=page_size,
    )


__all__ = ["router"]
