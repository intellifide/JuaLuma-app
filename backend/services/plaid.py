# Updated 2025-12-18 20:25 CST by Antigravity
"""
Lightweight Plaid helper functions for local development.

These helpers intentionally keep side effects narrow and raise informative errors
when credentials are missing so local developers can diagnose setup issues.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from functools import lru_cache
import time
from typing import Dict, Iterable, List, Tuple
import logging

logger = logging.getLogger(__name__)

from plaid import ApiClient, Configuration, Environment
from plaid.api import plaid_api
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
from plaid.model.investments_transactions_get_request_options import (
    InvestmentsTransactionsGetRequestOptions,
)
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.exceptions import ApiException

from backend.core import settings


def _get_environment() -> Environment:
    """
    Map PLAID_ENV to a supported Plaid environment.

    The plaid-python client does not expose Environment.Development; for local/dev
    we should use sandbox. Production remains available for actual deployments.
    """
    env_name = settings.plaid_env.lower()
    if env_name in {"production", "prod"}:
        return Environment.Production
    # Treat development/dev the same as sandbox for local testing.
    return Environment.Sandbox


def _get_credentials() -> Tuple[str, str]:
    return settings.plaid_client_id, settings.plaid_secret


@lru_cache(maxsize=1)
def get_plaid_client() -> plaid_api.PlaidApi:
    """
    Return a cached Plaid API client configured from environment variables.
    """
    client_id, secret = _get_credentials()
    configuration = Configuration(
        host=_get_environment(),
        api_key={"clientId": client_id, "secret": secret},
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def _wrap_plaid_error(action: str, exc: ApiException) -> RuntimeError:
    """Convert Plaid ApiException into a friendlier RuntimeError."""
    detail = getattr(exc, "body", None) or str(exc)
    return RuntimeError(f"Plaid {action} failed: {detail}")


def _pick_currency(iso_code: str | None, unofficial_code: str | None) -> str | None:
    """Return the official currency code if present, otherwise unofficial."""
    return iso_code or unofficial_code


def create_link_token(user_id: str, products: Iterable[str]) -> Tuple[str, str]:
    """
    Generate a link_token for the Link flow and return its expiration.
    """
    client = get_plaid_client()
    requested_products = [Products(p) for p in products]

    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="jualuma",
        products=requested_products,
        country_codes=[CountryCode("US")],
        language="en",
    )

    try:
        response = client.link_token_create(request)
    except ApiException as exc:
        raise _wrap_plaid_error("link_token creation", exc)

    expiration = (
        response.expiration
        if isinstance(response.expiration, str)
        else getattr(response, "expiration", None)
    )
    return response.link_token, expiration or ""


def exchange_public_token(public_token: str) -> Tuple[str, str]:
    """
    Exchange a public_token for an access_token and item_id.
    """
    client = get_plaid_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)

    try:
        response = client.item_public_token_exchange(request)
    except ApiException as exc:
        raise _wrap_plaid_error("token exchange", exc)

    return response.access_token, response.item_id


def remove_item(access_token: str) -> None:
    """
    Remove an Item via the Plaid API (unlinks the connection).
    """
    client = get_plaid_client()
    request = ItemRemoveRequest(access_token=access_token)

    try:
        client.item_remove(request)
    except ApiException as exc:
        # If item is already gone (e.g. ITEM_NOT_FOUND), treat as success or ignore
        err_body = getattr(exc, "body", "")
        if "ITEM_NOT_FOUND" in str(err_body):
            logger.warning("Plaid remove_item: Item not found (already removed?)")
            return
        raise _wrap_plaid_error("item_remove", exc)


def fetch_accounts(access_token: str) -> List[Dict[str, object]]:
    """
    Retrieve accounts for a given access token.

    Returns a list of dictionaries with friendly field names for downstream use.
    """
    client = get_plaid_client()
    request = AccountsGetRequest(access_token=access_token)

    try:
        response = client.accounts_get(request)
    except ApiException as exc:
        raise _wrap_plaid_error("accounts_get", exc)

    accounts: List[Dict[str, object]] = []
    for account in response.accounts:
        balances = account.balances
        currency = _pick_currency(
            getattr(balances, "iso_currency_code", None),
            getattr(balances, "unofficial_currency_code", None),
        )
        accounts.append(
            {
                "account_id": account.account_id,
                "name": account.name,
                "official_name": account.official_name,
                "mask": account.mask,
                "type": account.type,
                "subtype": account.subtype,
                "balance_available": balances.available,
                "balance_current": balances.current,
                "currency": currency,
            }
        )

    return accounts


def fetch_transactions(
    access_token: str,
    start_date: date,
    end_date: date,
    *,
    page_size: int = 500,
    max_pages: int = 10,
) -> List[Dict[str, object]]:
    """
    Retrieve transactions within a date window, honoring Plaid pagination limits.

    Raises a RuntimeError for Plaid errors and retries rate limits with backoff.
    """
    if start_date > end_date:
        raise ValueError("start_date must be before or equal to end_date.")

    client = get_plaid_client()
    all_transactions: List[Dict[str, object]] = []
    offset = 0
    pages = 0

    while True:
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            options=TransactionsGetRequestOptions(count=page_size, offset=offset),
        )

        for attempt in range(3):
            try:
                response = client.transactions_get(request)
                break
            except ApiException as exc:
                if getattr(exc, "status", None) == 429 and attempt < 2:
                    time.sleep(2**attempt)
                    continue

                # Handle PRODUCT_NOT_READY gracefully for fresh items
                error_body = getattr(exc, "body", "")
                if "PRODUCT_NOT_READY" in str(error_body) or "PRODUCT_NOT_READY" in str(exc):
                    logger.warning(f"Plaid product not ready, returning empty transactions: {exc}")
                    return []
                
                raise _wrap_plaid_error("transactions_get", exc)

        for txn in response.transactions:
            currency = _pick_currency(
                getattr(txn, "iso_currency_code", None),
                getattr(txn, "unofficial_currency_code", None),
            )
            # Plaid may return date as string or datetime.date; normalize to date.
            txn_date = txn.date
            if isinstance(txn_date, str):
                txn_date = datetime.strptime(txn_date, "%Y-%m-%d").date()
            elif isinstance(txn_date, datetime):
                txn_date = txn_date.date()
            all_transactions.append(
                {
                    "transaction_id": txn.transaction_id,
                    "account_id": txn.account_id,
                    "name": txn.name,
                    "amount": Decimal(str(txn.amount)),
                    "date": txn_date,
                    "category": (txn.category or [None])[0] if txn.category else None,
                    "merchant_name": txn.merchant_name,
                    "currency": currency,
                }
            )

        offset += len(response.transactions)
        pages += 1
        if offset >= response.total_transactions or pages >= max_pages:
            break

    return all_transactions


def fetch_investments(
    access_token: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Dict[str, List[Dict[str, object]]]:
    """
    Retrieve holdings and investment transactions for Pro/Ultimate tiers.

    Defaults to the past 30 days for transactions if no window is provided.
    """
    today = date.today()
    resolved_start = start_date or (today - timedelta(days=30))
    resolved_end = end_date or today

    if resolved_start > resolved_end:
        raise ValueError("start_date must be before or equal to end_date.")

    client = get_plaid_client()

    try:
        holdings_response = client.investments_holdings_get(
            InvestmentsHoldingsGetRequest(access_token=access_token)
        )
    except ApiException as exc:
        raise _wrap_plaid_error("investments_holdings_get", exc)

    holdings: List[Dict[str, object]] = []
    for holding in holdings_response.holdings:
        security = next(
            (s for s in holdings_response.securities if s.security_id == holding.security_id),
            None,
        )
        currency = _pick_currency(
            getattr(security, "iso_currency_code", None) if security else None,
            getattr(security, "unofficial_currency_code", None) if security else None,
        )
        holdings.append(
            {
                "security_id": holding.security_id,
                "quantity": holding.quantity,
                "institution_value": holding.institution_value,
                "cost_basis": holding.cost_basis,
                "currency": currency,
                "name": getattr(security, "name", None) if security else None,
                "ticker": getattr(security, "ticker_symbol", None) if security else None,
            }
        )

    investment_transactions: List[Dict[str, object]] = []
    offset = 0
    max_pages = 5
    page = 0

    while True:
        txn_request = InvestmentsTransactionsGetRequest(
            access_token=access_token,
            start_date=resolved_start,
            end_date=resolved_end,
            options=InvestmentsTransactionsGetRequestOptions(count=500, offset=offset),
        )

        try:
            txn_response = client.investments_transactions_get(txn_request)
        except ApiException as exc:
            raise _wrap_plaid_error("investments_transactions_get", exc)

        for txn in txn_response.investment_transactions:
            currency = _pick_currency(
                getattr(txn, "iso_currency_code", None),
                getattr(txn, "unofficial_currency_code", None),
            )
            investment_transactions.append(
                {
                    "investment_transaction_id": txn.investment_transaction_id,
                    "account_id": txn.account_id,
                    "name": txn.name,
                    "amount": Decimal(str(txn.amount)),
                    "date": datetime.strptime(txn.date, "%Y-%m-%d").date(),
                    "type": txn.type,
                    "quantity": txn.quantity,
                    "price": txn.price,
                    "currency": currency,
                }
            )

        offset += len(txn_response.investment_transactions)
        page += 1
        if offset >= txn_response.total_investment_transactions or page >= max_pages:
            break

    return {"holdings": holdings, "investment_transactions": investment_transactions}


__all__ = [
    "get_plaid_client",
    "create_link_token",
    "exchange_public_token",
    "remove_item",
    "fetch_accounts",
    "fetch_transactions",
    "fetch_investments",
]
