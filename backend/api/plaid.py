# Updated 2025-12-08 21:10 CST by ChatGPT
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.core.constants import SubscriptionPlans, TierLimits
from backend.core.dependencies import get_current_active_subscription
from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, User
from backend.services.analytics import invalidate_analytics_cache
from backend.services.plaid import (
    PlaidItemLoginRequired,
    create_link_token,
    exchange_public_token,
    fetch_accounts,
)
from backend.utils import get_db
from backend.utils.secret_manager import store_secret

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: str


class ExchangeTokenRequest(BaseModel):
    public_token: str = Field(min_length=1, description="Public token from Plaid Link.")
    institution_name: str = Field(
        min_length=1, max_length=128, description="Institution selected in Link."
    )
    selected_account_ids: list[str] | None = Field(
        default=None,
        description="Optional Plaid account IDs selected in Link.",
    )


class ExchangeAccount(BaseModel):
    id: uuid.UUID
    account_name: str | None = None
    provider: str | None = None
    account_type: str | None = None
    balance: Decimal | None = None
    currency: str | None = None
    account_number_masked: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ExchangeTokenResponse(BaseModel):
    item_id: str
    accounts: list[ExchangeAccount]


@router.post("/link-token", response_model=LinkTokenResponse)
def create_link_token_endpoint(
    current_user: User = Depends(get_current_user),
) -> LinkTokenResponse:
    """Create a link_token for the authenticated user."""
    try:
        link_token, expiration = create_link_token(
            current_user.uid, products=["transactions", "investments"]
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc

    # Plaid SDK may return expiration as datetime; response model expects string.
    return LinkTokenResponse(link_token=link_token, expiration=str(expiration))


@router.post(
    "/exchange-token",
    response_model=ExchangeTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def exchange_token_endpoint(
    payload: ExchangeTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExchangeTokenResponse:
    """Exchange a public_token, persist linked accounts, and log the action."""
    active_subscription = get_current_active_subscription(current_user)
    plan_code = active_subscription.plan if active_subscription else SubscriptionPlans.FREE
    tier = SubscriptionPlans.get_base_tier(plan_code)
    tier_limits = TierLimits.LIMITS_BY_TIER.get(tier, TierLimits.FREE_LIMITS)
    tier_display = tier.capitalize()

    try:
        access_token, item_id = exchange_public_token(payload.public_token)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We could not link your account at this time. Please try again.",
        ) from exc

    try:
        plaid_accounts = fetch_accounts(access_token)
    except PlaidItemLoginRequired as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your linked institution requires you to reauthenticate via Plaid Link.",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve accounts from your institution. Please try again.",
        ) from exc

    linked_accounts: list[Account] = []

    selected_ids = {
        account_id.strip()
        for account_id in (payload.selected_account_ids or [])
        if isinstance(account_id, str) and account_id.strip()
    }
    if selected_ids:
        selected_accounts = [
            account_data
            for account_data in plaid_accounts
            if str(account_data.get("account_id") or "").strip() in selected_ids
        ]
        found_ids = {
            str(account_data.get("account_id") or "").strip()
            for account_data in selected_accounts
        }
        missing_ids = selected_ids - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more selected Plaid accounts were not returned by the institution.",
            )
    else:
        selected_accounts = plaid_accounts

    if not selected_accounts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No accounts were selected to connect.",
        )

    plaid_limit = tier_limits.get("plaid", 0)
    existing_plaid_count = (
        db.query(Account)
        .filter(
            and_(
                Account.uid == current_user.uid,
                Account.account_type.in_(["traditional", "investment"]),
                Account.secret_ref.isnot(None),
            )
        )
        .count()
    )

    new_accounts_to_add = 0
    seen_new_accounts: set[str] = set()
    for account_data in selected_accounts:
        mask = account_data.get("mask")
        account_id = str(account_data.get("account_id") or "").strip()
        dedupe_key = account_id or str(mask or "")
        if not dedupe_key:
            continue

        existing = (
            db.query(Account)
            .filter(
                Account.uid == current_user.uid,
                Account.provider == payload.institution_name,
                Account.account_number_masked == mask,
            )
            .first()
        )

        if existing:
            continue

        if dedupe_key not in seen_new_accounts:
            seen_new_accounts.add(dedupe_key)
            new_accounts_to_add += 1

    projected_total = existing_plaid_count + new_accounts_to_add
    if projected_total > plaid_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"You've reached your {tier_display} plan limit of {plaid_limit} "
                f"Plaid-connected account{'s' if plaid_limit != 1 else ''}. "
                "Please remove an account or upgrade your plan."
            ),
        )

    secret_ref = store_secret(
        access_token, uid=current_user.uid, purpose="plaid-access"
    )

    for account_data in selected_accounts:
        mask = account_data.get("mask")
        balance_raw = account_data.get("balance_current")
        balance = Decimal(str(balance_raw)) if balance_raw is not None else None
        currency = account_data.get("currency") or current_user.currency_pref or "USD"
        account_name = account_data.get("official_name") or account_data.get("name")
        plaid_type = account_data.get("type")
        plaid_subtype = account_data.get("subtype")

        existing = (
            db.query(Account)
            .filter(
                Account.uid == current_user.uid,
                Account.provider == payload.institution_name,
                Account.account_number_masked == mask,
            )
            .first()
        )

        if existing:
            existing.account_name = account_name
            existing.balance = balance
            existing.currency = currency
            existing.secret_ref = secret_ref
            existing.plaid_type = plaid_type or existing.plaid_type
            existing.plaid_subtype = plaid_subtype or existing.plaid_subtype
            linked_accounts.append(existing)
            continue

        account = Account(
            uid=current_user.uid,
            account_type="traditional",
            provider=payload.institution_name,
            account_name=account_name,
            account_number_masked=mask,
            plaid_type=plaid_type,
            plaid_subtype=plaid_subtype,
            balance=balance,
            currency=currency,
            secret_ref=secret_ref,
        )
        db.add(account)
        linked_accounts.append(account)

    db.commit()
    for account in linked_accounts:
        db.refresh(account)

    audit = AuditLog(
        actor_uid=current_user.uid,
        target_uid=current_user.uid,
        action="plaid_exchange_token",
        source="backend",
        metadata_json={
            "item_id": item_id,
            "institution": payload.institution_name,
            "accounts": [str(account.id) for account in linked_accounts],
        },
    )
    db.add(audit)
    db.commit()

    # Invalidate analytics cache so dashboard reflects new data
    invalidate_analytics_cache(current_user.uid)

    return ExchangeTokenResponse(item_id=item_id, accounts=linked_accounts)


__all__ = ["router"]
