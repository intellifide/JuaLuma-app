# Updated 2025-12-18 20:25 CST by Antigravity
import json
import logging
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from web3 import Web3  # For address validation

from backend.core.dependencies import enforce_account_limit
from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, Subscription, Transaction, User
from backend.services.categorization import predict_category
from backend.services.connectors import build_connector
from backend.services.plaid import fetch_accounts, fetch_transactions, remove_item
from backend.utils import get_db
from backend.utils.encryption import decrypt_secret, encrypt_secret
from backend.services.analytics import invalidate_analytics_cache

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
logger = logging.getLogger(__name__)

_ALLOWED_ACCOUNT_TYPES = {"traditional", "investment", "web3", "cex", "manual"}


class AccountCreate(BaseModel):
    account_type: str = Field(description="Type of account to create.")
    provider: str | None = Field(default=None, max_length=64)
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


class AccountUpdate(BaseModel):
    account_name: str | None = Field(default=None, max_length=256)
    balance: Decimal | None = Field(default=None, ge=0)

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
    category: str | None = None
    merchant_name: str | None = None
    description: str | None = None

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
    account_type: str | None = None
    provider: str | None = None
    account_name: str | None = None
    account_number_masked: str | None = None
    balance: Decimal | None = None
    currency: str | None = None
    secret_ref: str | None = None
    created_at: datetime
    updated_at: datetime
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
    if plan == "essential":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manual sync is disabled for Essential tier. Your accounts update automatically every 24 hours.",
        )

    if plan != "free":
        return

    since = datetime.now(UTC) - timedelta(days=1)
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
    transactions: list[Transaction] | None = None,
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
    account_type: str | None = Query(
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
    "/link/web3", response_model=AccountResponse, status_code=status.HTTP_201_CREATED
)
def link_web3_account(
    payload: Web3LinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountResponse:
    """
    Link a Web3 wallet (Ethereum address).
    Validates the address format and prevents duplicate linking of the same address by the same user.
    """
    # 1. Check duplicate checks
    # While secret_ref might differ in formatting, we check if any existing account has this address in secret_ref
    # Since secret_ref is text, we can do a ILIKE or JSON exact match.
    # For now, let's just fetch all web3 accounts and check in python to handle JSON parsing safely,
    # or rely on a simple string check if we ensure stored format is consistent.

    # Simple consistent storage format:
    secret_data = {"address": payload.address, "chain_id": payload.chain_id}
    secret_ref_str = json.dumps(secret_data, sort_keys=True)

    # Check for duplicates using Python iteration to be safe against JSON variations if not strict,
    # or just checking the address field inside.
    existing_accounts = (
        db.query(Account)
        .filter(Account.uid == current_user.uid, Account.account_type == "web3")
        .all()
    )

    for acc in existing_accounts:
        if not acc.secret_ref:
            continue
        try:
            stored = json.loads(acc.secret_ref)
            if stored.get("address") == payload.address:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Wallet address {payload.address} is already linked.",
                )
        except json.JSONDecodeError:
            continue

    enforce_account_limit(current_user, db, "web3")

    account = Account(
        uid=current_user.uid,
        account_type="web3",
        provider="ethereum",
        account_name=payload.account_name,
        currency="ETH",
        secret_ref=secret_ref_str,
        balance=Decimal("0.0"),  # Will be updated via sync
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_linked_web3",
        source="backend",
        metadata_json={"account_id": str(account.id), "address": payload.address},
    )
    db.add(audit)
    db.commit()

    return _serialize_account(account)


@router.post(
    "/link/cex", response_model=AccountResponse, status_code=status.HTTP_201_CREATED
)
def link_cex_account(
    payload: CexLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountResponse:
    """
    Link a Centralized Exchange (CEX) account using API credentials.
    Validates credentials by attempting a connection (or mock validation).
    Encrypts API secrets before storage.
    """
    # 1. Validate credentials
    try:
        # build_connector handles the logic of choosing mock vs real based on ENV
        connector = build_connector(
            kind="cex",
            exchange_id=payload.exchange_id,
            api_key=payload.api_key,
            api_secret=payload.api_secret,
        )
        # Attempt to fetch transactions (or just a basic check if available) to validate keys.
        # Since fetch_transactions pulls up to 50, it's a reasonable connectivity check.
        # We pass a dummy account_id as we are just testing connectivity.
        list(connector.fetch_transactions(account_id="validation_check"))
    except Exception as e:
        logger.warning(f"CEX validation failed for {payload.exchange_id}: {e}")
        # In production, we'd want to block invalid keys. In dev/mock, it might pass.
        # If it's a specific credential error, raise 400.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to validate CEX credentials: {str(e)}",
        ) from e

    # 2. Encrypt secrets
    secret_data = {"apiKey": payload.api_key, "secret": payload.api_secret}
    secret_json = json.dumps(secret_data)
    encrypted_ref = encrypt_secret(secret_json, current_user.uid)

    enforce_account_limit(current_user, db, "cex")

    account = Account(
        uid=current_user.uid,
        account_type="cex",
        provider=payload.exchange_id,
        account_name=payload.account_name,
        currency="USD",  # Default for CEX until synced
        secret_ref=encrypted_ref,
        balance=Decimal("0.0"),
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_linked_cex",
        source="backend",
        metadata_json={"account_id": str(account.id), "exchange": payload.exchange_id},
    )
    db.add(audit)
    db.commit()

    return _serialize_account(account)


def _sync_traditional(account: Account, start: date, end: date) -> list[dict]:
    try:
        return fetch_transactions(account.secret_ref, start, end)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Plaid sync failed: {exc}"
        ) from exc


def _sync_web3(account: Account) -> list[dict]:
    try:
        conn_data = json.loads(account.secret_ref)
        address = conn_data.get("address")
        if not address:
            raise ValueError("Invalid Web3 configuration")

        connector = build_connector(kind="web3", rpc_url=None)
        normalized_txns = connector.fetch_transactions(account_id=address)

        return [
            {
                "date": t.timestamp.date(),
                "transaction_id": t.tx_id,
                "amount": float(t.amount),
                "currency": t.currency_code,
                "category": ["Transfer"] if t.type == "transfer" else ["Trade"],
                "merchant_name": t.merchant_name,
                "name": t.merchant_name or t.tx_id[:8],
            }
            for t in normalized_txns
        ]
    except Exception as e:
        logger.error(f"Web3 sync error: {e}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Web3 sync failed: {e}"
        ) from e


def _sync_cex(account: Account, uid: str) -> list[dict]:
    try:
        decrypted_json = decrypt_secret(account.secret_ref, uid)
        creds = json.loads(decrypted_json)

        connector = build_connector(
            kind="cex",
            exchange_id=account.provider,
            api_key=creds.get("apiKey"),
            api_secret=creds.get("secret"),
        )
        normalized_txns = connector.fetch_transactions(account_id=str(account.id))

        return [
            {
                "date": t.timestamp.date(),
                "transaction_id": t.tx_id,
                "amount": float(t.amount),
                "currency": t.currency_code,
                "category": ["Trade"] if t.type == "trade" else ["Transfer"],
                "merchant_name": t.merchant_name,
                "name": f"{t.counterparty} {t.type}",
            }
            for t in normalized_txns
        ]
    except Exception as e:
        logger.error(f"CEX sync error: {e}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Failed to decrypt credentials or sync CEX",
        ) from e


def _refresh_traditional_balance(account: Account, user_pref: str | None) -> str | None:
    """Updates account balance from Plaid and returns the Plaid account ID if found."""
    if account.account_type != "traditional":
        return None
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
            if match.get("balance_current") is not None:
                account.balance = Decimal(str(match.get("balance_current")))
            account.currency = (
                match.get("currency") or account.currency or user_pref or "USD"
            )
            return match.get("account_id")
    except Exception as e:
        logger.warning(f"Failed to match Plaid account or refresh balance: {e}")
    return None


def _clean_raw(txn_dict: dict) -> dict:
    clean = {}
    for k, v in txn_dict.items():
        if isinstance(v, Decimal):
            clean[k] = float(v)
        elif isinstance(v, datetime | date):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return clean


def _process_single_transaction(
    db: Session, uid: str, account_id: uuid.UUID, txn: dict, currency_fallback: str
) -> bool:
    """Returns True if a new transaction was created, False if updated."""
    d = txn["date"]
    if isinstance(d, str):
        d = date.fromisoformat(d)
    txn_ts = datetime.combine(d, datetime.min.time(), tzinfo=UTC)

    existing = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            Transaction.account_id == account_id,
            Transaction.external_id == txn.get("transaction_id"),
        )
        .first()
    )

    # Auto categorization
    merchant_key = txn.get("merchant_name") or txn.get("name")
    predicted_category = predict_category(db, uid, merchant_key)
    final_category = predicted_category
    if not final_category:
        cats = txn.get("category")
        if isinstance(cats, list) and cats:
            final_category = cats[0]

    if existing:
        existing.ts = txn_ts
        existing.amount = txn["amount"]
        existing.currency = txn.get("currency") or existing.currency
        existing.category = final_category
        existing.merchant_name = txn.get("merchant_name")
        existing.description = txn.get("name") or txn.get("merchant_name")
        existing.raw_json = _clean_raw(txn)
        db.add(existing)
        return False

    new_txn = Transaction(
        uid=uid,
        account_id=account_id,
        ts=txn_ts,
        amount=txn["amount"],
        currency=txn.get("currency") or currency_fallback,
        category=final_category,
        merchant_name=txn.get("merchant_name"),
        description=txn.get("name") or txn.get("merchant_name"),
        external_id=txn.get("transaction_id"),
        is_manual=False,
        archived=False,
        raw_json=_clean_raw(txn),
    )
    db.add(new_txn)
    return True


def _resolve_sync_dates(
    start_date: date | None, end_date: date | None
) -> tuple[date, date]:
    today = date.today()
    resolved_start = start_date or (today - timedelta(days=30))
    resolved_end = end_date or today
    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date.",
        )
    return resolved_start, resolved_end


def _execute_provider_sync(
    account: Account, start: date, end: date, user: User
) -> list[dict]:
    fetched = []
    if account.account_type == "traditional":
        fetched = _sync_traditional(account, start, end)
        pid = _refresh_traditional_balance(account, user.currency_pref)
        if pid:
            fetched = [t for t in fetched if t.get("account_id") == pid]
    elif account.account_type == "web3":
        fetched = _sync_web3(account)
    elif account.account_type == "cex":
        fetched = _sync_cex(account, user.uid)
    return fetched


def _save_sync_batch(
    db: Session,
    uid: str,
    account_id: uuid.UUID,
    txns: list[dict],
    currency_fallback: str,
) -> tuple[int, int]:
    synced = 0
    new_count = 0
    for txn in txns:
        is_new = _process_single_transaction(
            db, uid, account_id, txn, currency_fallback
        )
        synced += 1
        if is_new:
            new_count += 1
    return synced, new_count


@router.post(
    "/{account_id}/sync",
    response_model=AccountSyncResponse,
    status_code=status.HTTP_200_OK,
)
def sync_account_transactions(
    account_id: uuid.UUID,
    start_date: date | None = Query(
        default=None, description="Start date (inclusive) for the sync window."
    ),
    end_date: date | None = Query(
        default=None, description="End date (inclusive) for the sync window."
    ),
    initial_sync: bool = Query(
        default=False, description="Bypass limit for initial post-link hydration."
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountSyncResponse:
    """
    Trigger a manual sync of transactions for a linked account (e.g., via Plaid).

    - **start_date**: Start of sync window (default: 30 days ago).
    - **end_date**: End of sync window (default: today).
    - **initial_sync**: If true, bypasses manual sync limits (internal use only).

    Rate limited for free tier users (unless initial_sync=True).
    Returns sync statistics.
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

    if account.account_type not in ["traditional", "web3", "cex"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sync not supported for account type: {account.account_type}",
        )

    if not account.secret_ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is missing credentials.",
        )

    plan = _get_subscription_plan(db, current_user.uid)
    if not initial_sync:
        _enforce_sync_limit(db, current_user.uid, plan)

    resolved_start, resolved_end = _resolve_sync_dates(start_date, end_date)

    # Dispatch Sync & process
    fetched_txns = _execute_provider_sync(
        account, resolved_start, resolved_end, current_user
    )

    currency_fallback = account.currency or "USD"
    synced, new_count = _save_sync_batch(
        db, current_user.uid, account.id, fetched_txns, currency_fallback
    )

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict while syncing transactions; please retry.",
        ) from e

    # Audit Log
    db.add(
        AuditLog(
            actor_uid=current_user.uid,
            target_uid=current_user.uid,
            action="account_sync_initial" if initial_sync else "account_sync_manual",
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
    )
    db.commit()
    invalidate_analytics_cache(current_user.uid)

    return AccountSyncResponse(
        synced_count=synced,
        new_transactions=new_count,
        start_date=resolved_start,
        end_date=resolved_end,
        plan=plan,
    )


@router.post(
    "/manual", response_model=AccountResponse, status_code=status.HTTP_201_CREATED
)
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
    invalidate_analytics_cache(current_user.uid)
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

    # Remove Plaid Item if traditional
    if account.account_type == "traditional" and account.secret_ref:
        logger.info(
            "Removing Plaid item for account %s with secret_ref=%s",
            account.id,
            account.secret_ref,
        )
        try:
            remove_item(account.secret_ref)
        except Exception as e:
            logger.error("Failed to remove Plaid item: %s", e)

    # Invalidate Analytics Cache
    invalidate_analytics_cache(current_user.uid)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_deleted",
        source="backend",
        metadata_json={
            "account_id": str(account.id),
            "account_type": account.account_type,
        },
    )
    db.add(audit)
    db.delete(account)
    db.commit()

    return {"message": "Account deleted"}


__all__ = ["router"]
