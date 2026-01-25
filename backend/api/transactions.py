"""Transaction API endpoints."""

# Updated 2026-01-25 01:35 CST

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
from backend.core.constants import SubscriptionPlans
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
    user_display_name: str | None = None  # Display name of transaction owner (Ultimate tier/household feature)

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


class TransactionCreate(BaseModel):
    """Schema for creating manual transactions."""
    account_id: uuid.UUID
    ts: datetime
    amount: Decimal = Field(..., description="Transaction amount (positive for income, negative for expenses)")
    currency: str = Field(default="USD", max_length=16)
    category: str | None = Field(default=None, max_length=64)
    merchant_name: str | None = Field(default=None, max_length=256)
    description: str | None = Field(default=None, max_length=512)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "account_id": "a41d9d49-7b20-4c30-a949-4a4b0b0302ea",
                    "ts": "2025-12-08T10:00:00Z",
                    "amount": -120.50,
                    "currency": "USD",
                    "category": "Shopping",
                    "merchant_name": "Amazon",
                    "description": "Holiday gifts",
                }
            ]
        }
    )


class TransactionUpdate(BaseModel):
    """Schema for updating transactions. For manual transactions, all fields can be updated."""
    category: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=512)
    # Additional fields for manual transactions
    amount: Decimal | None = Field(default=None, description="Only editable for manual transactions")
    merchant_name: str | None = Field(default=None, max_length=256, description="Only editable for manual transactions")
    ts: datetime | None = Field(default=None, description="Only editable for manual transactions")

    @model_validator(mode="after")
    def at_least_one_field(self) -> "TransactionUpdate":
        if all(v is None for v in [self.category, self.description, self.amount, self.merchant_name, self.ts]):
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


def _should_include_user_names(
    db: Session, current_user: User, scope: str, household_owner_uid: str | None = None
) -> bool:
    """
    Determine if user display names should be included in transaction responses.
    Returns True for Ultimate tier subscribers or household members with view permission.
    """
    if scope == "household":
        # Household scope already verified Ultimate subscription
        return True
    
    # Check if current user has Ultimate tier
    user_sub = (
        db.query(Subscription)
        .filter(Subscription.uid == current_user.uid, Subscription.status == "active")
        .first()
    )
    if user_sub and "ultimate" in user_sub.plan.lower():
        return True
    
    # Check if user is a household member with view permission
    if current_user.household_member and current_user.household_member.can_view_household:
        # Verify household owner has Ultimate
        household = (
            db.query(Household)
            .filter(Household.id == current_user.household_member.household_id)
            .first()
        )
        if household:
            owner_sub = (
                db.query(Subscription)
                .filter(Subscription.uid == household.owner_uid, Subscription.status == "active")
                .first()
            )
            if owner_sub and "ultimate" in owner_sub.plan.lower():
                return True
    
    return False


def _build_transaction_responses(
    db: Session, items: list[Transaction], include_user_names: bool
) -> list[TransactionResponse]:
    """Build transaction responses with optional user display names."""
    if not include_user_names:
        return [
            TransactionResponse(
                id=txn.id,
                ts=txn.ts,
                amount=txn.amount,
                currency=txn.currency,
                category=txn.category,
                merchant_name=txn.merchant_name,
                description=txn.description,
                account_id=txn.account_id,
                external_id=txn.external_id,
                is_manual=txn.is_manual,
                archived=txn.archived,
                raw_json=txn.raw_json,
                user_display_name=None,
            )
            for txn in items
        ]
    
    # Load users for all transaction UIDs
    transaction_uids = list(set(t.uid for t in items))
    users = {u.uid: u for u in db.query(User).filter(User.uid.in_(transaction_uids)).all()}
    
    return [
        TransactionResponse(
            id=txn.id,
            ts=txn.ts,
            amount=txn.amount,
            currency=txn.currency,
            category=txn.category,
            merchant_name=txn.merchant_name,
            description=txn.description,
            account_id=txn.account_id,
            external_id=txn.external_id,
            is_manual=txn.is_manual,
            archived=txn.archived,
            raw_json=txn.raw_json,
            user_display_name=users.get(txn.uid).get_display_name() if users.get(txn.uid) else None,
        )
        for txn in items
    ]


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
                detail="You are not currently part of a household.",
            )

        # Check Household Owner's Subscription
        household = (
            db.query(Household).filter(Household.id == member.household_id).first()
        )
        if not household:
            raise HTTPException(status_code=404, detail="The requested household profile could not be found.")

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
                detail="Household features require an active Ultimate subscription.",
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
    
    # Check if we should include user display names
    should_include_user_names = _should_include_user_names(db, current_user, scope)
    
    # Build transaction responses with optional user display names
    transaction_responses = _build_transaction_responses(db, items, should_include_user_names)
    
    return TransactionListResponse(
        transactions=transaction_responses,
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
    
    # Check if we should include user display names (personal scope, but Ultimate tier)
    should_include_user_names = _should_include_user_names(db, current_user, "personal")
    
    # Build transaction responses with optional user display names
    transaction_responses = _build_transaction_responses(db, items, should_include_user_names)
    
    return TransactionListResponse(
        transactions=transaction_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_manual_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionResponse:
    """
    Create a manual transaction entry.
    
    Restricted to Pro and Ultimate tier subscribers.

    - **account_id**: UUID of the account to associate this transaction with.
    - **ts**: Transaction timestamp.
    - **amount**: Transaction amount (positive for income, negative for expenses).
    - **currency**: Currency code (default: USD).
    - **category**: Optional category.
    - **merchant_name**: Optional merchant name.
    - **description**: Optional description.
    """
    # Check subscription tier - manual transactions are Pro/Ultimate only
    from backend.api.accounts import _get_subscription_plan
    plan_code = _get_subscription_plan(db, current_user.uid)
    # Normalize plan code (e.g., "pro_monthly" -> "pro", "ultimate_annual" -> "ultimate")
    base_tier = SubscriptionPlans.get_base_tier(plan_code)
    if base_tier not in ["pro", "ultimate"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manual transaction entry is only available for Pro and Ultimate tier subscribers.",
        )
    
    # Verify account belongs to user and is a manual account
    from backend.models import Account
    
    account = (
        db.query(Account)
        .filter(
            Account.id == payload.account_id,
            Account.uid == current_user.uid,
        )
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified account could not be found.",
        )
    
    if account.account_type != "manual":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual transactions can only be created for manual accounts.",
        )

    # Create the transaction
    txn = Transaction(
        uid=current_user.uid,
        account_id=payload.account_id,
        ts=payload.ts,
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        merchant_name=payload.merchant_name,
        description=payload.description,
        external_id=None,  # Manual transactions don't have external IDs
        is_manual=True,
        archived=False,
        raw_json={"source": "manual", "created_by": current_user.uid},
    )
    
    db.add(txn)
    
    # Update the account balance to reflect the manual transaction
    # Inflows (positive amounts) increase balance, outflows (negative amounts) decrease balance
    from decimal import Decimal as Dec
    current_balance = account.balance or Dec(0)
    account.balance = current_balance + payload.amount
    logger.info(f"Updated account {account.id} balance: {current_balance} -> {account.balance} (delta: {payload.amount})")
    
    # Create audit log
    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_manual_created",
        source="backend",
        metadata_json={
            "transaction_id": str(txn.id),
            "account_id": str(payload.account_id),
            "amount": float(payload.amount),
            "currency": payload.currency,
            "balance_before": float(current_balance),
            "balance_after": float(account.balance),
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(txn)

    invalidate_analytics_cache(current_user.uid)

    return txn


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
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified transaction could not be found."
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
            detail="Some of the selected transactions could not be updated.",
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
    """
    Update transaction fields.
    
    For manual transactions, all fields (amount, merchant_name, ts, category, description) can be updated.
    For automated transactions, only category and description can be updated.
    """
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.uid == current_user.uid)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified transaction could not be found."
        )

    # Track old values for audit log
    old_values = {
        "category": txn.category,
        "description": txn.description,
        "amount": float(txn.amount) if txn.is_manual else None,
        "merchant_name": txn.merchant_name if txn.is_manual else None,
        "ts": txn.ts.isoformat() if txn.is_manual else None,
    }

    # Update fields that are always editable
    if payload.category is not None:
        txn.category = payload.category
    if payload.description is not None:
        txn.description = payload.description

    # For manual transactions, allow updating additional fields
    if txn.is_manual:
        if payload.amount is not None:
            txn.amount = payload.amount
        if payload.merchant_name is not None:
            txn.merchant_name = payload.merchant_name
        if payload.ts is not None:
            txn.ts = payload.ts
    else:
        # Reject attempts to edit restricted fields for automated transactions
        if payload.amount is not None or payload.merchant_name is not None or payload.ts is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount, merchant name, and timestamp can only be edited for manual transactions.",
            )

    db.add(txn)
    
    # Build audit metadata
    new_values = {
        "category": txn.category,
        "description": txn.description,
    }
    if txn.is_manual:
        new_values.update({
            "amount": float(txn.amount),
            "merchant_name": txn.merchant_name,
            "ts": txn.ts.isoformat(),
        })
    
    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_edit",
        source="backend",
        metadata_json={
            "transaction_id": str(txn.id),
            "is_manual": txn.is_manual,
            "old_values": old_values,
            "new_values": new_values,
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
    from backend.models import Account
    from decimal import Decimal as Dec
    
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.uid == current_user.uid)
        .first()
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified transaction could not be found."
        )
    if not txn.is_manual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Automated transactions cannot be deleted manually.",
        )

    # Reverse the balance change when deleting a manual transaction
    account = db.query(Account).filter(Account.id == txn.account_id).first()
    balance_before = None
    balance_after = None
    if account:
        balance_before = float(account.balance or Dec(0))
        current_balance = account.balance or Dec(0)
        # Reverse the transaction: subtract the original amount
        account.balance = current_balance - (txn.amount or Dec(0))
        balance_after = float(account.balance)
        logger.info(f"Reversed account {account.id} balance: {balance_before} -> {balance_after} (reversed delta: {txn.amount})")

    txn.archived = True
    db.add(txn)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="transaction_deleted",
        source="backend",
        metadata_json={
            "transaction_id": str(txn.id),
            "is_manual": txn.is_manual,
            "amount_reversed": float(txn.amount or 0),
            "balance_before": balance_before,
            "balance_after": balance_after,
        },
    )
    db.add(audit)
    db.commit()

    invalidate_analytics_cache(current_user.uid)

    return {"message": "Transaction deleted"}


__all__ = ["router"]
