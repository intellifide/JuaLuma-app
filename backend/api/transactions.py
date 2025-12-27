"""Transaction API endpoints."""

# Updated 2025-12-10 14:58 CST by ChatGPT

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import (
    AuditLog,
    Household,
    HouseholdMember,
    Subscription,
    Transaction,
    User,
)
from backend.services.analytics import invalidate_analytics_cache
from backend.utils import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


# Pydantic schemas
class TransactionResponse(BaseModel):
    id: uuid.UUID
    ts: datetime
    amount: Decimal
    currency: str
    category: str | None = None
    merchant_name: str | None = None
    description: str | None = None
    account_id: uuid.UUID
    external_id: str | None = None
    is_manual: bool
    archived: bool
    raw_json: dict | None = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "0c50b2ec-4c41-4ad0-8e01-2e0c9dc15642",
                    "ts": "2025-12-08T10:00:00Z",
                    "amount": 120.5,
                    "currency": "USD",
                    "category": "shopping",
                    "merchant_name": "Amazon",
                    "description": "Holiday gifts",
                    "account_id": "a41d9d49-7b20-4c30-a949-4a4b0b0302ea",
                    "external_id": "txn_123",
                    "is_manual": False,
                    "archived": False,
                    "raw_json": {"source": "plaid"},
                }
            ]
        },
    )


class TransactionUpdate(BaseModel):
    category: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=512)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "TransactionUpdate":
        if self.category is None and self.description is None:
            raise ValueError("Provide at least one field to update.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"category": "transport"},
                {"description": "Updated memo"},
                {"category": "groceries", "description": "Weekly groceries"},
            ]
        }
    )


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "transactions": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 50,
                }
            ]
        }
    )


class BulkUpdateRequest(BaseModel):
    transaction_ids: list[uuid.UUID] = Field(
        min_length=1, description="List of transaction IDs to update."
    )
    updates: TransactionUpdate

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "transaction_ids": [
                        "0c50b2ec-4c41-4ad0-8e01-2e0c9dc15642",
                        "e5b96b66-7822-4b79-a98e-857a3ef91c2e",
                    ],
                    "updates": {
                        "category": "travel",
                        "description": "Vacation booking",
                    },
                }
            ]
        }
    )


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
    account_id: uuid.UUID | None,
    category: str | None,
    start_date: date | None,
    end_date: date | None,
):
    if account_id:
        db_query = db_query.filter(Transaction.account_id == account_id)
    if category:
        db_query = db_query.filter(Transaction.category == category)
    if start_date:
        db_query = db_query.filter(
            Transaction.ts
            >= datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
        )
    if end_date:
        db_query = db_query.filter(
            Transaction.ts
            <= datetime.combine(end_date, datetime.max.time(), tzinfo=UTC)
        )
    return db_query


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    account_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    search: str | None = Query(
        default=None, description="Search merchant or description."
    ),
    scope: str = Query(default="personal", description="personal or household"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    """
    List transactions with filters.

    - **scope**: 'personal' (default) or 'household' (requires Ultimate/Household membership).
    """
    # 1. Determine Target UIDs
    target_uids = [current_user.uid]

    if scope == "household":
        # Check permissions
        member = (
            db.query(HouseholdMember)
            .filter(HouseholdMember.uid == current_user.uid)
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of a household.",
            )

        # Check Household Owner's Subscription
        household = (
            db.query(Household).filter(Household.id == member.household_id).first()
        )
        if not household:
            raise HTTPException(status_code=404, detail="Household not found.")

        owner_sub = (
            db.query(Subscription)
            .filter(Subscription.uid == household.owner_uid)
            .first()
        )

        # Robust string check for 'ultimate'
        if (
            not owner_sub
            or "ultimate" not in owner_sub.plan
            or owner_sub.status != "active"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Household subscription requires Ultimate tier.",
            )

        # Get all members of this household
        members = (
            db.query(HouseholdMember)
            .filter(HouseholdMember.household_id == household.id)
            .all()
        )
        target_uids = [m.uid for m in members]

    # 2. Query
    logger.info(f"Listing transactions. Scope={scope}, CurrentUser={current_user.uid}, TargetUIDs={target_uids}")
    
    query = db.query(Transaction).filter(
        Transaction.uid.in_(target_uids),
        Transaction.archived.is_(False),
    )

    query = _apply_filters(
        query,
        account_id=account_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
    )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.merchant_name.ilike(pattern),
                Transaction.description.ilike(pattern),
            )
        )

    total, items = _paginate(query, page, page_size)
    return TransactionListResponse(
        transactions=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=TransactionListResponse)
def search_transactions(
    q: str = Query(min_length=1, description="Search term"),
    account_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    # 2025-12-10 21:55 CST - ensure search route precedes /{transaction_id}
    """Search transactions using PostgreSQL full-text search."""
    query = db.query(Transaction).filter(
        Transaction.uid == current_user.uid,
        Transaction.archived.is_(False),
    )
    query = _apply_filters(
        query,
        account_id=account_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
    )

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
    # 2025-12-10 21:21 CST - exclude archived soft-deleted transactions.
    txn = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.uid == current_user.uid,
            Transaction.archived.is_(False),
        )
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

    invalidate_analytics_cache(current_user.uid)

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

    invalidate_analytics_cache(current_user.uid)

    # Auto-categorization learning
    if payload.category and txn.merchant_name:
        from backend.services.categorization import learn_rule

        learn_rule(db, current_user.uid, txn.merchant_name, payload.category)

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

    invalidate_analytics_cache(current_user.uid)

    return {"message": "Transaction deleted"}


__all__ = ["router"]
