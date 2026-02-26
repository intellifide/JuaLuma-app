# Updated 2026-02-10 14:25 CST - item-centric Plaid linking with tier policy and mappings
from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.core.constants import SubscriptionPlans, TierLimits
from backend.core.dependencies import get_current_active_subscription
from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, PlaidItem, PlaidItemAccount, User
from backend.services.analytics import invalidate_analytics_cache
from backend.services.plaid import (
    PlaidItemLoginRequired,
    create_link_token,
    exchange_public_token,
    fetch_accounts,
)
from backend.services.plaid_sync import PLAID_SYNC_STATUS_SYNC_NEEDED, sync_plaid_item
from backend.utils import get_db
from backend.utils.secret_manager import get_secret, store_secret

router = APIRouter(prefix="/api/plaid", tags=["plaid"])
logger = logging.getLogger(__name__)


def _days_requested_for_tier(tier: str) -> int:
    return {
        SubscriptionPlans.FREE: 30,
        SubscriptionPlans.ESSENTIAL: 180,
        SubscriptionPlans.PRO: 365,
        SubscriptionPlans.ULTIMATE: 730,
    }.get(tier, 30)


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


class LinkTokenUpdateRequest(BaseModel):
    item_id: str = Field(min_length=1, max_length=128)


@router.post("/link-token", response_model=LinkTokenResponse)
def create_link_token_endpoint(
    current_user: User = Depends(get_current_user),
) -> LinkTokenResponse:
    """Create a link_token for the authenticated user with tier-specific history limits."""
    active_subscription = get_current_active_subscription(current_user)
    plan_code = active_subscription.plan if active_subscription else SubscriptionPlans.FREE
    tier = SubscriptionPlans.get_base_tier(plan_code)
    days_requested = _days_requested_for_tier(tier)

    try:
        link_token, expiration = create_link_token(
            current_user.uid,
            products=["transactions", "investments"],
            days_requested=days_requested,
        )
    except RuntimeError as exc:
        logger.error(
            "Plaid link token creation failed for uid=%s: %s",
            current_user.uid,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc

    return LinkTokenResponse(link_token=link_token, expiration=str(expiration))


@router.post("/link-token/update", response_model=LinkTokenResponse)
def create_update_link_token_endpoint(
    payload: LinkTokenUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LinkTokenResponse:
    """Create an update-mode Link token for an existing Plaid Item."""
    plaid_item = (
        db.query(PlaidItem)
        .filter(
            PlaidItem.uid == current_user.uid,
            PlaidItem.item_id == payload.item_id,
            PlaidItem.is_active.is_(True),
            PlaidItem.removed_at.is_(None),
        )
        .first()
    )
    if plaid_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plaid item was not found.",
        )

    try:
        access_token = get_secret(plaid_item.secret_ref, uid=current_user.uid)
        link_token, expiration = create_link_token(
            current_user.uid,
            products=[],
            access_token=access_token,
        )
    except RuntimeError as exc:
        logger.error(
            "Plaid update-mode link token creation failed for uid=%s item_id=%s: %s",
            current_user.uid,
            payload.item_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

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
    """Exchange a public_token, persist/update Plaid Item + account mappings, and log the action."""
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
        .join(PlaidItemAccount, PlaidItemAccount.account_id == Account.id)
        .join(PlaidItem, PlaidItem.id == PlaidItemAccount.plaid_item_id)
        .filter(
            Account.uid == current_user.uid,
            PlaidItem.is_active.is_(True),
            PlaidItem.removed_at.is_(None),
            PlaidItemAccount.is_active.is_(True),
        )
        .count()
    )

    new_accounts_to_add = 0
    for account_data in selected_accounts:
        plaid_account_id = str(account_data.get("account_id") or "").strip()
        mask = account_data.get("mask")
        account_type = "investment" if str(account_data.get("type") or "").lower() == "investment" else "traditional"

        existing_link = (
            db.query(PlaidItemAccount)
            .join(Account, Account.id == PlaidItemAccount.account_id)
            .filter(
                PlaidItemAccount.uid == current_user.uid,
                PlaidItemAccount.plaid_account_id == plaid_account_id,
                PlaidItemAccount.is_active.is_(True),
                Account.uid == current_user.uid,
            )
            .first()
        )
        if existing_link:
            continue

        existing_account = (
            db.query(Account)
            .filter(
                Account.uid == current_user.uid,
                Account.provider == payload.institution_name,
                Account.account_number_masked == mask,
                Account.account_type == account_type,
            )
            .first()
        )
        if existing_account:
            continue
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

    now_utc = datetime.now(UTC)
    plaid_item = db.query(PlaidItem).filter(PlaidItem.item_id == item_id).first()
    if plaid_item and plaid_item.uid != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This institution link is already associated with another account.",
        )
    if not plaid_item:
        plaid_item = PlaidItem(
            uid=current_user.uid,
            item_id=item_id,
            institution_name=payload.institution_name,
            secret_ref=secret_ref,
            sync_status=PLAID_SYNC_STATUS_SYNC_NEEDED,
            sync_needed_at=now_utc,
            is_active=True,
        )
        db.add(plaid_item)
        db.flush()
    else:
        plaid_item.institution_name = payload.institution_name
        plaid_item.secret_ref = secret_ref
        plaid_item.sync_status = PLAID_SYNC_STATUS_SYNC_NEEDED
        plaid_item.sync_needed_at = now_utc
        plaid_item.is_active = True
        plaid_item.removed_at = None
        plaid_item.last_sync_error = None
        db.add(plaid_item)

    linked_accounts: list[Account] = []
    for account_data in selected_accounts:
        plaid_account_id = str(account_data.get("account_id") or "").strip()
        mask = account_data.get("mask")
        balance_raw = account_data.get("balance_current")
        balance = Decimal(str(balance_raw)) if balance_raw is not None else None
        currency = account_data.get("currency") or current_user.currency_pref or "USD"
        account_name = account_data.get("official_name") or account_data.get("name")
        plaid_type = account_data.get("type")
        plaid_subtype = account_data.get("subtype")
        account_type = "investment" if str(plaid_type or "").lower() == "investment" else "traditional"

        existing_link = (
            db.query(PlaidItemAccount)
            .join(Account, Account.id == PlaidItemAccount.account_id)
            .filter(
                PlaidItemAccount.uid == current_user.uid,
                PlaidItemAccount.plaid_account_id == plaid_account_id,
                Account.uid == current_user.uid,
            )
            .first()
        )
        account: Account | None = existing_link.account if existing_link else None
        if account is None:
            account = (
                db.query(Account)
                .filter(
                    Account.uid == current_user.uid,
                    Account.provider == payload.institution_name,
                    Account.account_number_masked == mask,
                    Account.account_type == account_type,
                )
                .first()
            )

        if account is None:
            account = Account(
                uid=current_user.uid,
                account_type=account_type,
                provider=payload.institution_name,
                account_name=account_name,
                account_number_masked=mask,
                plaid_type=str(plaid_type) if plaid_type else None,
                plaid_subtype=str(plaid_subtype) if plaid_subtype else None,
                balance=balance,
                currency=currency,
                secret_ref=secret_ref,  # backward compatibility for legacy reads
                sync_status="active",
            )
            db.add(account)
            db.flush()
        else:
            account.account_type = account_type
            account.provider = payload.institution_name
            account.account_name = account_name
            account.account_number_masked = mask
            account.balance = balance
            account.currency = currency
            account.secret_ref = secret_ref  # backward compatibility for legacy reads
            account.sync_status = "active"
            if plaid_type:
                account.plaid_type = str(plaid_type)
            if plaid_subtype:
                account.plaid_subtype = str(plaid_subtype)
            db.add(account)

        mapping = (
            db.query(PlaidItemAccount)
            .filter(PlaidItemAccount.account_id == account.id)
            .first()
        )
        if mapping is None:
            mapping = PlaidItemAccount(
                uid=current_user.uid,
                plaid_item_id=plaid_item.id,
                account_id=account.id,
                plaid_account_id=plaid_account_id or None,
                is_active=True,
                last_seen_at=now_utc,
            )
        else:
            mapping.uid = current_user.uid
            mapping.plaid_item_id = plaid_item.id
            mapping.plaid_account_id = plaid_account_id or mapping.plaid_account_id
            mapping.is_active = True
            mapping.last_seen_at = now_utc
        db.add(mapping)
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

    invalidate_analytics_cache(current_user.uid)

    try:
        sync_plaid_item(db, plaid_item, trigger="exchange_token")
    except Exception:
        import logging
        logging.getLogger(__name__).warning(
            "Inline sync after exchange-token failed for item %s; will retry via job.",
            item_id,
            exc_info=True,
        )

    return ExchangeTokenResponse(item_id=item_id, accounts=linked_accounts)


__all__ = ["router"]
