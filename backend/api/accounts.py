# Updated 2026-01-23 15:00 CST
import json
import logging
import re
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.core.dependencies import enforce_account_limit
from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, Subscription, Transaction, User
from backend.services.analytics import invalidate_analytics_cache
from backend.services.categorization import predict_category
from backend.services.connectors import build_connector
from backend.services.crypto_history import BitqueryUnavailableError, fetch_crypto_history
from backend.services.web3_history import ProviderError, ProviderOverloaded, fetch_web3_history
from backend.services.household_service import get_household_member_uids
from backend.services.plaid import fetch_accounts, fetch_transactions, remove_item
from backend.utils import get_db
from backend.utils.secret_manager import get_secret, store_secret

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
logger = logging.getLogger(__name__)

_ALLOWED_ACCOUNT_TYPES = {"traditional", "investment", "web3", "cex", "manual"}
_CAIP2_PATTERN = re.compile(r"^[a-z0-9-]{2,32}:[A-Za-z0-9.-]{1,64}$")
_EVM_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")
_MAX_ADDRESS_LENGTH = 256


def _canonicalize_chain(chain: str) -> str:
    namespace, reference = chain.split(":", 1)
    return f"{namespace.lower()}:{reference}"


def _resolve_web3_chain(chain: str | None, chain_id: int | None) -> tuple[str, str, str]:
    if chain:
        cleaned = chain.strip()
        if not _CAIP2_PATTERN.match(cleaned):
            raise ValueError("chain must be a CAIP-2 chain id like 'eip155:1'")
        canonical = _canonicalize_chain(cleaned)
        namespace, reference = canonical.split(":", 1)
    else:
        reference = str(chain_id or 1)
        namespace = "eip155"
        canonical = f"{namespace}:{reference}"

    if namespace == "eip155" and not reference.isdigit():
        raise ValueError("eip155 chain reference must be a numeric chain id")
    if chain_id is not None and namespace != "eip155":
        raise ValueError("chain_id is only supported for eip155 chains")
    if chain_id is not None and namespace == "eip155" and reference != str(chain_id):
        raise ValueError("chain_id does not match chain")

    return canonical, namespace, reference


def _get_chain_config(chain: str) -> tuple[str | None, str]:
    """Return (rpc_url, symbol) for a given CAIP-2 chain id."""
    # EVM chains with configured RPCs
    if chain == "eip155:1":
        return settings.eth_rpc_url, "ETH"
    if chain == "eip155:137":
        return settings.polygon_rpc_url, "MATIC"
    if chain == "eip155:56":
        return settings.bsc_rpc_url, "BNB"

    # Known symbols for non-EVM or unsupported sync chains
    symbols = {
        "bip122:000000000019d6689c085ae165831e93": "BTC",
        "solana:5eykt6UsFvXYuy2aiUB66XX7hsgnSSXq": "SOL",
        "ripple:mainnet": "XRP",
        "cardano:mainnet": "ADA",
        "tron:mainnet": "TRX",
    }
    return None, symbols.get(chain, "ETH")


def _normalize_web3_address(address: str, namespace: str) -> str:
    cleaned = address.strip()
    if not cleaned:
        raise ValueError("Wallet address is required")
    if any(ch.isspace() for ch in cleaned):
        raise ValueError("Wallet address must not contain whitespace")
    if len(cleaned) > _MAX_ADDRESS_LENGTH:
        raise ValueError("Wallet address is too long")
    if namespace == "eip155":
        if not _EVM_ADDRESS_PATTERN.match(cleaned):
            raise ValueError("Invalid EVM address format")
        return cleaned.lower()
    return cleaned


def _normalize_web3_identity(chain: str, address: str) -> tuple[str, str]:
    namespace = chain.split(":", 1)[0].lower()
    if namespace == "eip155":
        return _canonicalize_chain(chain), address.lower()
    return _canonicalize_chain(chain), address


def _extract_web3_identity(secret_ref: str) -> tuple[str | None, str | None]:
    try:
        stored = json.loads(secret_ref)
    except json.JSONDecodeError:
        return None, None
    address = stored.get("address")
    chain = stored.get("chain")
    if not chain:
        chain_id = stored.get("chain_id") or 1
        chain = f"eip155:{chain_id}"
    try:
        return _canonicalize_chain(chain), address
    except ValueError:
        return None, None


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
    address: str = Field(description="Wallet public address")
    chain_id: int | None = Field(
        default=None, ge=1, description="Legacy EVM chain id (e.g., 1 for mainnet)"
    )
    chain: str | None = Field(
        default=None, description="CAIP-2 chain id (e.g., eip155:1, solana:mainnet)"
    )
    account_name: str = Field(max_length=256)

    @model_validator(mode="after")
    def normalize(self) -> "Web3LinkRequest":
        chain, namespace, reference = _resolve_web3_chain(self.chain, self.chain_id)
        self.chain = chain
        if namespace == "eip155":
            self.chain_id = int(reference)
        else:
            self.chain_id = None
        self.address = _normalize_web3_address(self.address, namespace)
        return self


class CexLinkRequest(BaseModel):
    exchange_id: str = Field(description="Exchange ID (e.g., coinbase, kraken)")
    api_key: str = Field(description="API Public Key")
    api_secret: str = Field(description="API Secret Key")
    account_name: str = Field(max_length=256)

    @field_validator("exchange_id")
    @classmethod
    def validate_exchange(cls, v: str) -> str:
        allowed = {"coinbase", "coinbaseadvanced", "kraken", "binance", "binanceus"}
        normalized = v.lower()
        # Map "coinbase" to "coinbaseadvanced" for Advanced Trade API compatibility
        if normalized == "coinbase":
            normalized = "coinbaseadvanced"
        if normalized not in allowed:
            raise ValueError(f"Unsupported exchange. Allowed: {allowed}")
        return v.lower()


class AccountUpdate(BaseModel):
    account_name: str | None = Field(default=None, max_length=256)
    balance: Decimal | None = Field(default=None, ge=0)
    assigned_member_uid: str | None = Field(default=None, description="UID of household member")
    custom_label: str | None = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "AccountUpdate":
        if (
            self.account_name is None
            and self.balance is None
            and self.assigned_member_uid is None
            and self.custom_label is None
        ):
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
    assigned_member_uid: str | None = None
    custom_label: str | None = None
    sync_status: str | None = None
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
            detail="Manual sync is not available for the Essential tier. Your accounts update automatically every 24 hours.",
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
            detail="You have reached the daily limit for manual syncs on the Free plan.",
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
        assigned_member_uid=account.assigned_member_uid,
        custom_label=account.custom_label,
        sync_status=account.sync_status,
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
    scope: str = Query(default="personal", pattern="^(personal|household)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AccountResponse]:
    """
    Retrieve all accounts owned by the authenticated user.

    - **account_type**: Optional filter (e.g., 'traditional', 'web3').
    - **include_balance**: If true, returns current balance (sensitive).
    - **scope**: 'personal' (default) or 'household'.

    Returns a list of account summaries.
    """
    if scope == "household":
        target_uids = get_household_member_uids(db, current_user.uid)
        query = db.query(Account).filter(Account.uid.in_(target_uids))
    else:
        allowed_uids = get_household_member_uids(db, current_user.uid)
        query = db.query(Account).filter(
            (Account.uid == current_user.uid)
            | (
                (Account.assigned_member_uid == current_user.uid)
                & (Account.uid.in_(allowed_uids))
            )
        )

    if account_type:
        normalized = account_type.lower()
        if normalized not in _ALLOWED_ACCOUNT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account type provided.",
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
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified account could not be found."
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
    Link a Web3 wallet (chain-agnostic).
    Validates the address format for the provided chain and prevents duplicate linking
    of the same chain + address by the same user.
    """
    # 1. Check duplicate checks
    # While secret_ref might differ in formatting, we check if any existing account has this address in secret_ref
    # Since secret_ref is text, we can do a ILIKE or JSON exact match.
    # For now, let's just fetch all web3 accounts and check in python to handle JSON parsing safely,
    # or rely on a simple string check if we ensure stored format is consistent.

    # Simple consistent storage format:
    chain = payload.chain or "eip155:1"
    chain_namespace, chain_reference = chain.split(":", 1)
    chain_namespace = chain_namespace.lower()
    secret_data = {
        "address": payload.address,
        "chain": chain,
    }
    if payload.chain_id is not None:
        secret_data["chain_id"] = payload.chain_id
    secret_ref_str = json.dumps(secret_data, sort_keys=True)

    # Check for duplicates using Python iteration to be safe against JSON variations if not strict,
    # or just checking the address field inside.
    existing_accounts = (
        db.query(Account)
        .filter(Account.uid == current_user.uid, Account.account_type == "web3")
        .all()
    )

    incoming_chain, incoming_address = _normalize_web3_identity(
        chain, payload.address
    )
    for acc in existing_accounts:
        if not acc.secret_ref:
            continue
        stored_chain, stored_address = _extract_web3_identity(acc.secret_ref)
        if not stored_chain or not stored_address:
            continue
        stored_chain_norm, stored_address_norm = _normalize_web3_identity(
            stored_chain, stored_address
        )
        if stored_chain_norm == incoming_chain and stored_address_norm == incoming_address:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This wallet address is already linked to your account.",
            )

    enforce_account_limit(current_user, db, "web3")

    _, symbol = _get_chain_config(chain)

    # Map namespace to friendly provider name
    friendly_providers = {
        "eip155": "ethereum",
        "bip122": "bitcoin",
        "solana": "solana",
        "ripple": "ripple",
        "cardano": "cardano",
        "tron": "tron"
    }
    provider_name = friendly_providers.get(chain_namespace, chain_namespace)

    account = Account(
        uid=current_user.uid,
        account_type="web3",
        provider=provider_name,
        account_name=payload.account_name,
        currency=symbol,
        secret_ref=secret_ref_str,
        balance=Decimal("0.0"),  # Will be updated via sync
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    # Trigger initial sync immediately so user sees transactions right away
    try:
        # Default window for initial sync: 30 days
        start, end = _resolve_sync_dates(None, None)
        fetched, next_cursor, cursor_chain, update_cursor = _execute_provider_sync(
            account, start, end, current_user
        )
        if fetched:
            _save_sync_batch(db, current_user.uid, account.id, fetched, symbol)
        if update_cursor:
            account.web3_sync_cursor = next_cursor
            account.web3_sync_chain = cursor_chain
            db.add(account)
        if fetched or update_cursor:
            db.commit()
    except Exception as e:
        logger.warning(f"Initial Web3 sync failed for {account.id}: {e}")
        # We don't raise here; account is linked, sync can happen later.

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="account_linked_web3",
        source="backend",
        metadata_json={
            "account_id": str(account.id),
            "address": payload.address,
            "chain": chain,
        },
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
        # Normalize API secret: convert literal \n escape sequences to actual newlines
        # When JSON is sent from frontend, if user pastes literal \n, JSON.stringify escapes it as \\n
        # JSON.parse then gives us literal \n (backslash-n), not actual newlines
        # We need to convert these to actual newlines for CCXT
        normalized_secret = payload.api_secret
        if normalized_secret:
            # Log what we received for debugging
            logger.debug(f"Received secret for {payload.exchange_id}: length={len(normalized_secret)}, starts with: {repr(normalized_secret[:50])}")
            
            # Always replace literal backslash-n with actual newlines (handles both cases)
            if "\\n" in normalized_secret:
                normalized_secret = normalized_secret.replace("\\n", "\n")
                logger.debug(f"Converted literal \\n to actual newlines for {payload.exchange_id}")
            
            # Ensure the secret has proper PEM format
            if "-----BEGIN" not in normalized_secret:
                logger.warning(f"Secret for {payload.exchange_id} doesn't appear to be in PEM format. First 100 chars: {repr(normalized_secret[:100])}")
            else:
                logger.debug(f"Secret for {payload.exchange_id} has proper PEM format")
        
        logger.debug(f"Validating CEX connection for {payload.exchange_id} with key: {payload.api_key[:50]}...")
        logger.debug(f"Normalized secret length: {len(normalized_secret) if normalized_secret else 0}, starts with: {repr(normalized_secret[:50]) if normalized_secret else 'None'}...")
        
        # build_connector handles the logic of choosing mock vs real based on ENV
        connector = build_connector(
            kind="cex",
            exchange_id=payload.exchange_id,
            api_key=payload.api_key,
            api_secret=normalized_secret,
        )
        # Attempt to fetch transactions (or just a basic check if available) to validate keys.
        # Since fetch_transactions pulls up to 50, it's a reasonable connectivity check.
        # We pass a dummy account_id as we are just testing connectivity.
        list(connector.fetch_transactions(account_id="validation_check"))
    except Exception as e:
        import traceback
        error_details = str(e)
        error_trace = traceback.format_exc()
        logger.warning(f"CEX validation failed for {payload.exchange_id}: {error_details}")
        logger.debug(f"CEX validation traceback: {error_trace}")
        
        # Extract more specific error information
        error_message = error_details
        if hasattr(e, '__cause__') and e.__cause__:
            error_message = f"{error_details} (Caused by: {str(e.__cause__)})"
        
        # In production, we'd want to block invalid keys. In dev/mock, it might pass.
        # If it's a specific credential error, raise 400.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"We were unable to verify your exchange credentials: {error_message}. Please double-check your API key and secret format.",
        ) from e

    # 2. Encrypt secrets (use normalized secret for storage)
    normalized_secret = payload.api_secret.replace("\\n", "\n") if payload.api_secret else ""
    secret_data = {"apiKey": payload.api_key, "secret": normalized_secret}
    secret_json = json.dumps(secret_data)
    secret_ref = store_secret(
        secret_json, uid=current_user.uid, purpose=f"cex-{payload.exchange_id}"
    )

    enforce_account_limit(current_user, db, "cex")

    account = Account(
        uid=current_user.uid,
        account_type="cex",
        provider=payload.exchange_id,
        account_name=payload.account_name,
        currency="USD",  # Default for CEX until synced
        secret_ref=secret_ref,
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
        access_token = get_secret(account.secret_ref or "", uid=account.uid)
        return fetch_transactions(access_token, start, end)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid account credentials."
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="We encountered an issue syncing with your bank. Please try again later."
        ) from exc


def _sync_web3(account: Account) -> tuple[list[dict], str | None, str | None, bool]:
    try:
        conn_data = json.loads(account.secret_ref)
        address = conn_data.get("address")
        if not address:
            raise ValueError("Invalid Web3 configuration")

        chain = conn_data.get("chain")
        if not chain:
            chain_id = conn_data.get("chain_id") or 1
            chain = f"eip155:{chain_id}"
        try:
            chain = _canonicalize_chain(chain)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid chain configuration for this wallet.",
            ) from exc
        cursor = (
            account.web3_sync_cursor
            if account.web3_sync_chain == chain
            else None
        )

        try:
            normalized_txns = fetch_crypto_history(account)
            return (
                [
                    {
                        "date": t.timestamp.date(),
                        "transaction_id": t.tx_id,
                        "amount": float(t.amount),
                        "currency": t.currency_code,
                        "category": ["Transfer"] if t.type == "transfer" else None,
                        "merchant_name": t.merchant_name,
                        "name": t.merchant_name or t.tx_id[:8],
                        "raw": t.raw,
                        "on_chain_units": t.on_chain_units,
                        "on_chain_symbol": t.on_chain_symbol,
                        "direction": t.direction,  # Pass direction for sign application
                        "transaction_type": t.type,  # Pass type for better categorization
                    }
                    for t in normalized_txns
                ],
                None,
                chain,
                True,
            )
        except BitqueryUnavailableError as exc:
            logger.warning("Bitquery unavailable; falling back to explorers: %s", exc)

        history = fetch_web3_history(address, chain, cursor)
        normalized_txns = history.transactions

        return (
            [
                {
                    "date": t.timestamp.date(),
                    "transaction_id": t.tx_id,
                    "amount": float(t.amount),
                    "currency": t.currency_code,
                    "category": ["Transfer"] if t.type == "transfer" else None,
                    "merchant_name": t.merchant_name,
                    "direction": t.direction,  # Pass direction for sign application
                    "transaction_type": t.type,  # Pass type for better categorization
                    "name": t.merchant_name or t.tx_id[:8],
                    "raw": t.raw,
                    "on_chain_units": t.on_chain_units,
                    "on_chain_symbol": t.on_chain_symbol,
                    "direction": t.direction,  # Pass direction for sign application
                    "transaction_type": t.type,  # Pass type for better categorization
                }
                for t in normalized_txns
            ],
            history.next_cursor,
            chain,
            history.update_cursor,
        )
    except HTTPException:
        raise
    except ProviderOverloaded:
        logger.warning("Web3 provider overloaded; skipping sync.")
        return [], None, None, False
    except ProviderError as exc:
        logger.exception("Web3 sync provider error: %s", exc)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "We encountered an issue syncing your wallet data. Please try again later.",
        ) from exc
    except Exception as e:
        logger.exception("Web3 sync error")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"We encountered an issue syncing your wallet data: {str(e)}"
        ) from e


def _sync_cex(account: Account, uid: str, start_date: date | None = None, end_date: date | None = None) -> list[dict]:
    """
    Sync CEX account transactions with optional date range filtering.
    
    Args:
        account: The CEX account to sync
        uid: User ID for secret retrieval
        start_date: Optional start date for transaction window (defaults to 90 days ago for expanded window)
        end_date: Optional end date for transaction window (defaults to today)
    """
    try:
        secret_json = get_secret(account.secret_ref or "", uid=uid)
        creds = json.loads(secret_json)

        connector = build_connector(
            kind="cex",
            exchange_id=account.provider,
            api_key=creds.get("apiKey"),
            api_secret=creds.get("secret"),
        )
        
        # Convert date range to datetime for connector
        since_datetime = None
        if start_date:
            since_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
        
        # Fetch transactions with expanded window (500 limit, up from 50)
        normalized_txns = connector.fetch_transactions(
            account_id=str(account.id),
            since=since_datetime,
            limit=500,
        )
        
        # Filter by end_date if provided (client-side filtering)
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time(), tzinfo=UTC)
            normalized_txns = [
                t for t in normalized_txns 
                if t.timestamp <= end_datetime
            ]

        return [
            {
                "date": t.timestamp.date(),
                "transaction_id": t.tx_id,
                "amount": float(t.amount),
                "currency": t.currency_code,
                "category": ["Transfer"] if t.type == "transfer" else None,
                "merchant_name": t.merchant_name,
                # Use merchant_name (which now includes trading pair, side, amount, price) as description
                "name": t.merchant_name or f"{t.counterparty} {t.type}",
                "direction": t.direction,  # Pass direction for sign application
                "transaction_type": t.type,  # Pass type for better categorization
            }
            for t in normalized_txns
        ]
    except Exception as e:
        logger.error(f"CEX sync error: {e}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "We encountered an issue connecting to your exchange. Please verify your credentials.",
        ) from e


def _refresh_traditional_balance(account: Account, user_pref: str | None) -> str | None:
    """Updates account balance from Plaid and returns the Plaid account ID if found."""
    if account.account_type != "traditional":
        return None
    try:
        access_token = get_secret(account.secret_ref or "", uid=account.uid)
        plaid_accounts = fetch_accounts(access_token)
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


def _clean_raw_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _clean_raw_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_clean_raw_value(v) for v in value]
    return value


def _clean_raw(txn_dict: dict) -> dict:
    cleaned = _clean_raw_value(txn_dict)
    if isinstance(cleaned, dict):
        return cleaned
    return {"value": cleaned}


def _process_single_transaction(
    db: Session, uid: str, account_id: uuid.UUID, txn: dict, currency_fallback: str
) -> bool:
    """
    Returns True if a new transaction was created, False if updated.
    
    Applies sign to amount based on direction:
    - CEX: buy = negative (money out), sell = positive (money in)
    - Web3: outflow = negative, inflow = positive
    - Traditional: negative amounts stay negative
    """
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

    # Apply sign based on direction for CEX and Web3 transactions
    amount = txn["amount"]
    direction = txn.get("direction")
    transaction_type = txn.get("transaction_type")
    
    # For CEX and Web3, apply sign based on direction
    if direction:
        if direction == "outflow":
            # Money leaving: make negative
            amount = -abs(amount)
        elif direction == "inflow":
            # Money coming in: make positive
            amount = abs(amount)
    # For traditional accounts (Plaid), amount already has correct sign

    # Auto categorization with improved logic for crypto
    merchant_key = txn.get("merchant_name") or txn.get("name")
    predicted_category = predict_category(db, uid, merchant_key)
    final_category = predicted_category
    
    # If no predicted category, use smarter defaults
    if not final_category:
        cats = txn.get("category")
        if isinstance(cats, list) and cats:
            final_category = cats[0]
        # Improved categorization for crypto transactions
        elif transaction_type == "trade":
            final_category = "Investment"  # Trades are investment activity
        elif transaction_type == "transfer" and direction == "inflow":
            final_category = "Income"  # Incoming transfers could be income
        elif transaction_type == "transfer" and direction == "outflow":
            final_category = "Transfer"  # Outgoing transfers

    if existing:
        existing.ts = txn_ts
        existing.amount = amount
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
        amount=amount,
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
    start_date: date | None, 
    end_date: date | None,
    account_type: str | None = None,
) -> tuple[date, date]:
    """
    Resolve sync date window with account-type-specific defaults.
    
    Args:
        start_date: Optional start date (if None, uses default based on account type)
        end_date: Optional end date (if None, defaults to today)
        account_type: Account type to determine default window (CEX gets 90 days, others get 30 days)
    """
    today = date.today()
    # CEX accounts get expanded 90-day window, others use 30-day default
    default_days = 90 if account_type == "cex" else 30
    resolved_start = start_date or (today - timedelta(days=default_days))
    resolved_end = end_date or today
    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The start date cannot be after the end date.",
        )
    return resolved_start, resolved_end


def _execute_provider_sync(
    account: Account, start: date, end: date, user: User
) -> tuple[list[dict], str | None, str | None, bool]:
    fetched: list[dict] = []
    next_cursor = None
    cursor_chain = None
    update_cursor = False
    if account.account_type == "traditional":
        fetched = _sync_traditional(account, start, end)
        pid = _refresh_traditional_balance(account, user.currency_pref)
        if pid:
            fetched = [t for t in fetched if t.get("account_id") == pid]
    elif account.account_type == "web3":
        fetched, next_cursor, cursor_chain, update_cursor = _sync_web3(account)
    elif account.account_type == "cex":
        # Pass date range to CEX sync for expanded transaction window
        fetched = _sync_cex(account, user.uid, start_date=start, end_date=end)
    return fetched, next_cursor, cursor_chain, update_cursor


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
            detail="This account type does not support manual synchronization.",
        )

    if not account.secret_ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account credentials appear to be missing. Please try re-linking the account.",
        )

    plan = _get_subscription_plan(db, current_user.uid)
    if not initial_sync:
        _enforce_sync_limit(db, current_user.uid, plan)

    resolved_start, resolved_end = _resolve_sync_dates(start_date, end_date, account.account_type)

    # Dispatch Sync & process
    fetched_txns, next_cursor, cursor_chain, update_cursor = _execute_provider_sync(
        account, resolved_start, resolved_end, current_user
    )

    currency_fallback = account.currency or "USD"
    synced, new_count = _save_sync_batch(
        db, current_user.uid, account.id, fetched_txns, currency_fallback
    )

    if account.account_type == "web3" and update_cursor:
        account.web3_sync_cursor = next_cursor
        account.web3_sync_chain = cursor_chain
        db.add(account)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A data conflict occurred while syncing transactions. Please try again.",
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
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified account could not be found."
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "balance" in update_data and account.account_type != "manual":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Balance updates are only allowed for manually tracked accounts.",
        )

    if "assigned_member_uid" in update_data:
        uid_val = update_data["assigned_member_uid"]
        if uid_val:
            allowed_uids = get_household_member_uids(db, current_user.uid)
            if uid_val not in allowed_uids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The assigned member could not be found in your household.",
                )

    for field, value in update_data.items():
        setattr(account, field, value)

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
            status_code=status.HTTP_404_NOT_FOUND, detail="The specified account could not be found."
        )

    # Remove Plaid Item if traditional
    if account.account_type == "traditional" and account.secret_ref:
        logger.info(
            "Removing Plaid item for account %s with secret_ref=%s",
            account.id,
            account.secret_ref,
        )
        try:
            access_token = get_secret(account.secret_ref, uid=current_user.uid)
            remove_item(access_token)
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
