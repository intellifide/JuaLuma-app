# Updated 2025-12-08 20:48 CST by ChatGPT
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, Transaction, User
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
