# Updated 2025-12-08 21:10 CST by ChatGPT
from decimal import Decimal
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import Account, AuditLog, User
from backend.services.plaid import (
    create_link_token,
    exchange_public_token,
    fetch_accounts,
)
from backend.utils import get_db

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: str


class ExchangeTokenRequest(BaseModel):
    public_token: str = Field(min_length=1, description="Public token from Plaid Link.")
    institution_name: str = Field(
        min_length=1, max_length=128, description="Institution selected in Link."
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
    try:
        access_token, item_id = exchange_public_token(payload.public_token)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Token exchange failed: {exc}",
        ) from exc

    try:
        plaid_accounts = fetch_accounts(access_token)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fetching accounts failed: {exc}",
        ) from exc

    linked_accounts: list[Account] = []

    for account_data in plaid_accounts:
        mask = account_data.get("mask")
        balance_raw = account_data.get("balance_current")
        balance = Decimal(str(balance_raw)) if balance_raw is not None else None
        currency = (
            account_data.get("currency")
            or current_user.currency_pref
            or "USD"
        )
        account_name = account_data.get("official_name") or account_data.get("name")

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
            existing.secret_ref = access_token
            linked_accounts.append(existing)
            continue

        account = Account(
            uid=current_user.uid,
            account_type="traditional",
            provider=payload.institution_name,
            account_name=account_name,
            account_number_masked=mask,
            balance=balance,
            currency=currency,
            secret_ref=access_token,
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

    return ExchangeTokenResponse(item_id=item_id, accounts=linked_accounts)


__all__ = ["router"]
