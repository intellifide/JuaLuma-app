# Updated 2025-12-08 21:27 CST by ChatGPT
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, Subscription, Transaction, User
from backend.services.plaid import fetch_accounts, fetch_transactions
from backend.utils import get_db

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
logger = logging.getLogger(__name__)

_ALLOWED_ACCOUNT_TYPES = {"traditional", "investment", "web3", "cex", "manual"}


class AccountCreate(BaseModel):
    account_type: str = Field(description="Type of account to create.")
    provider: Optional[str] = Field(default=None, max_length=64)
    account_name: str = Field(max_length=256, description="Human-friendly name.")

    @field_validator("account_type")
    @classmethod
    def validate_account_type(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in _ALLOWED_ACCOUNT_TYPES:
            raise ValueError(
                f"account_type must be one of {sorted(_ALLOWED_ACCOUNT_TYPES)}"
            )
        return normalized


class AccountUpdate(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=256)
    balance: Optional[Decimal] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "AccountUpdate":
        if self.account_name is None and self.balance is None:
            raise ValueError("Provide at least one field to update.")
        return self


class TransactionSummary(BaseModel):
    id: uuid.UUID
    ts: datetime
    amount: Decimal
    currency: str
    category: Optional[str] = None
    merchant_name: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AccountResponse(BaseModel):
    id: uuid.UUID
    uid: str
    account_type: Optional[str] = None
    provider: Optional[str] = None
    account_name: Optional[str] = None
    account_number_masked: Optional[str] = None
    balance: Optional[Decimal] = None
    currency: Optional[str] = None
    secret_ref: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    transactions: list[TransactionSummary] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AccountSyncResponse(BaseModel):
    synced_count: int
    new_transactions: int
    start_date: date
    end_date: date
    plan: str


def _get_subscription_plan(db: Session, uid: str) -> str:
    """Return the user's current subscription plan or 'free' as a fallback."""
    subscription = (
        db.query(Subscription)
        .filter(Subscription.uid == uid)
        .order_by(desc(Subscription.created_at))
        .first()
    )
    return subscription.plan if subscription else "free"


def _enforce_sync_limit(db: Session, uid: str, plan: str) -> None:
    """Enforce Free-tier manual sync limits."""
    if plan != "free":
        return

    since = datetime.now(timezone.utc) - timedelta(days=1)
    sync_count = (
        db.query(AuditLog)
        .filter(
            AuditLog.actor_uid == uid,
            AuditLog.action == "account_sync_manual",
            AuditLog.ts >= since,
        )
        .count()
    )
    if sync_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Free plan limit reached: 10 manual syncs per 24 hours.",
        )


def _serialize_account(
    account: Account,
    *,
    include_balance: bool = True,
    transactions: Optional[list[Transaction]] = None,
) -> AccountResponse:
    """Convert an Account ORM object into a response schema."""
    txns = transactions or []
    response_balance = account.balance if include_balance else None
    return AccountResponse(
        id=account.id,
        uid=account.uid,
        account_type=account.account_type,
        provider=account.provider,
        account_name=account.account_name,
        account_number_masked=account.account_number_masked,
        balance=response_balance,
        currency=account.currency,
        secret_ref=account.secret_ref,
        created_at=account.created_at,
        updated_at=account.updated_at,
        transactions=txns,
    )


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    account_type: Optional[str] = Query(
        default=None, description="Optional filter by account_type."
    ),
    include_balance: bool = Query(
        default=True,
        description="If false, balance will be omitted to reduce sensitivity.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AccountResponse]:
    """List the current user's accounts with optional filtering."""
    query = db.query(Account).filter(Account.uid == current_user.uid)

    if account_type:
        normalized = account_type.lower()
        if normalized not in _ALLOWED_ACCOUNT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"account_type must be one of {sorted(_ALLOWED_ACCOUNT_TYPES)}",
            )
        query = query.filter(Account.account_type == normalized)

    accounts = query.order_by(desc(Account.created_at)).all()
    return [
        _serialize_account(account, include_balance=include_balance)
        for account in accounts
    ]


@router.get("/{account_id}", response_model=AccountResponse)
def get_account_details(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountResponse:
    """Return a single account with its recent transactions."""
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.uid == current_user.uid)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
        )

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account_id, Transaction.uid == current_user.uid
        )
        .order_by(desc(Transaction.ts))
        .limit(10)
        .all()
    )

    return _serialize_account(account, transactions=transactions)


@router.post(
    "/{account_id}/sync",
    response_model=AccountSyncResponse,
    status_code=status.HTTP_200_OK,
)
def sync_account_transactions(
    account_id: uuid.UUID,
    start_date: Optional[date] = Query(
        default=None, description="Start date (inclusive) for the sync window."
    ),
    end_date: Optional[date] = Query(
        default=None, description="End date (inclusive) for the sync window."
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountSyncResponse:
    """
    Sync transactions for a Plaid-linked account and upsert into the ledger.
    """
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.uid == current_user.uid,
            Account.account_type == "traditional",
        )
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or unsupported for sync.",
        )

    if not account.secret_ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is missing Plaid access token.",
        )

    plan = _get_subscription_plan(db, current_user.uid)
    _enforce_sync_limit(db, current_user.uid, plan)

    today = date.today()
    resolved_start = start_date or (today - timedelta(days=30))
    resolved_end = end_date or today
    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date.",
        )

    try:
        plaid_transactions = fetch_transactions(
            account.secret_ref, resolved_start, resolved_end
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Plaid sync failed: {exc}",
        ) from exc

    # Optionally refresh balance if Plaid provides it.
    try:
        plaid_accounts = fetch_accounts(account.secret_ref)
        match = next(
            (
                acct
                for acct in plaid_accounts
                if acct.get("mask") == account.account_number_masked
            ),
            None,
        )
        if match:
            balance_raw = match.get("balance_current")
            if balance_raw is not None:
                account.balance = Decimal(str(balance_raw))
            account.currency = (
                match.get("currency")
                or account.currency
                or current_user.currency_pref
                or "USD"
            )
    except Exception:
        # Non-fatal: keep existing balance if Plaid balance refresh fails.
        pass

    synced = 0
    new_count = 0

    for txn in plaid_transactions:
        txn_ts = datetime.combine(
            txn["date"], datetime.min.time(), tzinfo=timezone.utc
        )
        existing = (
            db.query(Transaction)
            .filter(
                Transaction.uid == current_user.uid,
                Transaction.account_id == account.id,
                Transaction.external_id == txn.get("transaction_id"),
            )
            .first()
        )

        if existing:
            existing.ts = txn_ts
            existing.amount = txn["amount"]
            existing.currency = txn.get("currency") or existing.currency
            existing.category = txn.get("category")
            existing.merchant_name = txn.get("merchant_name")
            existing.description = txn.get("name") or txn.get("merchant_name")
            existing.raw_json = txn
            db.add(existing)
            synced += 1
            continue

        new_txn = Transaction(
            uid=current_user.uid,
            account_id=account.id,
            ts=txn_ts,
            amount=txn["amount"],
            currency=txn.get("currency") or account.currency or "USD",
            category=txn.get("category"),
            merchant_name=txn.get("merchant_name"),
            description=txn.get("name") or txn.get("merchant_name"),
            external_id=txn.get("transaction_id"),
            is_manual=False,
            archived=False,
            raw_json=txn,
        )
        db.add(new_txn)
        synced += 1
        new_count += 1

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict while syncing transactions; please retry.",
        )

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_sync_manual",
        source="backend",
        metadata_json={
            "account_id": str(account.id),
            "plan": plan,
            "synced_count": synced,
            "new_transactions": new_count,
            "start_date": resolved_start.isoformat(),
            "end_date": resolved_end.isoformat(),
        },
    )
    db.add(audit)
    db.commit()

    return AccountSyncResponse(
        synced_count=synced,
        new_transactions=new_count,
        start_date=resolved_start,
        end_date=resolved_end,
        plan=plan,
    )


@router.post("/manual", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_manual_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountResponse:
    """
    Create a manual account for asset tracking (house, car, collectibles).
    """
    account = Account(
        uid=current_user.uid,
        account_type="manual",
        provider=payload.provider or "manual",
        account_name=payload.account_name,
        currency=current_user.currency_pref or "USD",
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_manual_created",
        source="backend",
        metadata_json={"account_id": str(account.id), "provider": account.provider},
    )
    db.add(audit)
    db.commit()

    return _serialize_account(account)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: uuid.UUID,
    payload: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountResponse:
    """Update mutable account fields."""
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.uid == current_user.uid)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
        )

    if payload.account_name is not None:
        account.account_name = payload.account_name

    if payload.balance is not None:
        if account.account_type != "manual":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Balance updates are only allowed for manual accounts.",
            )
        account.balance = payload.balance

    db.add(account)
    db.commit()
    db.refresh(account)

    return _serialize_account(account)


@router.delete("/{account_id}", status_code=status.HTTP_200_OK)
def delete_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete an account and cascade related data."""
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.uid == current_user.uid)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
        )

    # Placeholder for Plaid item removal; integrates when Plaid tokens are stored.
    if account.account_type != "manual" and account.secret_ref:
        logger.info(
            "Requested Plaid item removal for account %s with secret_ref=%s",
            account.id,
            account.secret_ref,
        )

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_deleted",
        source="backend",
        metadata_json={"account_id": str(account.id), "account_type": account.account_type},
    )
    db.add(audit)
    db.delete(account)
    db.commit()

    return {"message": "Account deleted"}


__all__ = ["router"]
