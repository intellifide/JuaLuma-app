# Updated 2025-12-10 14:58 CST by ChatGPT
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.core.dependencies import enforce_account_limit
from backend.core.dependencies import enforce_account_limit
from backend.models import Account, AuditLog, Subscription, Transaction, User
from backend.services.plaid import fetch_accounts, fetch_transactions
from backend.utils import get_db
from backend.utils.encryption import encrypt_secret, decrypt_secret
from backend.services.connectors import build_connector
from web3 import Web3  # For address validation
import json
import os
from backend.utils.encryption import encrypt_secret, decrypt_secret
from web3 import Web3  # For address validation
import json

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
logger = logging.getLogger(__name__)

_ALLOWED_ACCOUNT_TYPES = {"traditional", "investment", "web3", "cex", "manual"}


class AccountCreate(BaseModel):
    account_type: str = Field(description="Type of account to create.")
    provider: Optional[str] = Field(default=None, max_length=64)
    account_name: str = Field(max_length=256, description="Human-friendly name.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "account_type": "traditional",
                    "provider": "plaid",
                    "account_name": "Chase Checking",
                }
            ]
        }
    )

    @field_validator("account_type")
    @classmethod
    def validate_account_type(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in _ALLOWED_ACCOUNT_TYPES:
            raise ValueError(
                f"account_type must be one of {sorted(_ALLOWED_ACCOUNT_TYPES)}"
            )
        return normalized


class Web3LinkRequest(BaseModel):
    address: str = Field(description="Wallet public address (0x...)")
    chain_id: int = Field(default=1, description="Chain ID (1=Mainnet)")
    account_name: str = Field(max_length=256)

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Web3 address format")
        return Web3.to_checksum_address(v)


class CexLinkRequest(BaseModel):
    exchange_id: str = Field(description="Exchange ID (e.g., coinbase, kraken)")
    api_key: str = Field(description="API Public Key")
    api_secret: str = Field(description="API Secret Key")
    account_name: str = Field(max_length=256)

    @field_validator("exchange_id")
    @classmethod
    def validate_exchange(cls, v: str) -> str:
        allowed = {"coinbase", "kraken", "binance", "binanceus"}
        if v.lower() not in allowed:
            raise ValueError(f"Unsupported exchange. Allowed: {allowed}")
        return v.lower()


class Web3LinkRequest(BaseModel):
    address: str = Field(description="Wallet public address (0x...)")
    chain_id: int = Field(default=1, description="Chain ID (1=Mainnet)")
    account_name: str = Field(max_length=256)

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Web3 address format")
        return Web3.to_checksum_address(v)


class CexLinkRequest(BaseModel):
    exchange_id: str = Field(description="Exchange ID (e.g., coinbase, kraken)")
    api_key: str = Field(description="API Public Key")
    api_secret: str = Field(description="API Secret Key")
    account_name: str = Field(max_length=256)

    @field_validator("exchange_id")
    @classmethod
    def validate_exchange(cls, v: str) -> str:
        allowed = {"coinbase", "kraken", "binance", "binanceus"}
        if v.lower() not in allowed:
            raise ValueError(f"Unsupported exchange. Allowed: {allowed}")
        return v.lower()


class AccountUpdate(BaseModel):
    account_name: Optional[str] = Field(default=None, max_length=256)
    balance: Optional[Decimal] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "AccountUpdate":
        if self.account_name is None and self.balance is None:
            raise ValueError("Provide at least one field to update.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"account_name": "New Nickname"},
                {"balance": "12500.50"},
            ]
        }
    )


class TransactionSummary(BaseModel):
    id: uuid.UUID
    ts: datetime
    amount: Decimal
    currency: str
    category: Optional[str] = None
    merchant_name: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "c8f6d764-d5bb-4b5c-b410-b5da7a0bc7b4",
                    "ts": "2025-12-08T10:00:00Z",
                    "amount": 120.5,
                    "currency": "USD",
                    "category": "shopping",
                    "merchant_name": "Amazon",
                    "description": "Holiday gifts",
                }
            ]
        },
    )


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
    sync_status: Optional[str] = "idle"
    last_synced_at: Optional[datetime] = None
    transactions: list[TransactionSummary] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "a41d9d49-7b20-4c30-a949-4a4b0b0302ea",
                    "uid": "user_123",
                    "account_type": "traditional",
                    "provider": "plaid",
                    "account_name": "Chase Checking",
                    "account_number_masked": "1234",
                    "balance": 15420.5,
                    "currency": "USD",
                    "secret_ref": "plaid-item-xyz",
                    "created_at": "2025-12-01T12:00:00Z",
                    "updated_at": "2025-12-05T09:15:00Z",
                    "transactions": [],
                }
            ]
        },
    )


class AccountSyncResponse(BaseModel):
    synced_count: int
    new_transactions: int
    start_date: date
    end_date: date
    plan: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "synced_count": 15,
                    "new_transactions": 5,
                    "start_date": "2025-11-10",
                    "end_date": "2025-12-10",
                    "plan": "free",
                }
            ]
        }
    )


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
    """
    Retrieve all accounts owned by the authenticated user.

    - **account_type**: Optional filter (e.g., 'traditional', 'web3').
    - **include_balance**: If true, returns current balance (sensitive).

    Returns a list of account summaries.
    """
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
    """
    Get detailed information for a specific account.

    - **account_id**: UUID of the account.

    Returns account details including the 10 most recent transactions.
    """
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
from backend.services.sync_service import perform_background_sync

@router.post(
    "/{account_id}/sync",
    response_model=AccountSyncResponse,
    status_code=status.HTTP_200_OK,
)
def sync_account_transactions(
    account_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountSyncResponse:
    """
    Trigger a background sync for a linked account.
    Returns immediately with status 'syncing'.
    """
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.uid == current_user.uid,
        )
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    if not account.secret_ref:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is missing credentials.",
        )

    # Rate Limit Check
    plan = _get_subscription_plan(db, current_user.uid)
    try:
        _enforce_sync_limit(db, current_user.uid, plan)
    except HTTPException:
        # If user is hitting button too fast, just return current state without erroring
        # to avoid bad UX, or re-raise if strictly needed. 
        # For now, let's re-raise so they know why.
        raise

    # 1. Update status immediately to prevent double-clicks
    account.sync_status = "queued"
    db.commit()

    # 2. Dispatch Task
    background_tasks.add_task(perform_background_sync, account.id, current_user.uid)

    # 3. Return 'empty' response saying it's queued
    # The frontend should poll or just show 'Syncing...' based on the initial click
    return AccountSyncResponse(
        synced_count=0,
        new_transactions=0,
        start_date=date.today(),
        end_date=date.today(),
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
    enforce_account_limit(current_user, db, "manual")

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
