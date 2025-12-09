# Updated 2025-12-08 20:48 CST by ChatGPT
"""
Lightweight Plaid helper functions for local development.

These helpers intentionally keep side effects narrow and raise informative errors
when credentials are missing so local developers can diagnose setup issues.
"""

from functools import lru_cache
import os
from typing import Iterable, Tuple

from plaid import ApiClient, Configuration, Environment
from plaid.api import plaid_api
from plaid.model import (
    CountryCode,
    ItemPublicTokenExchangeRequest,
    LinkTokenCreateRequest,
    LinkTokenCreateRequestUser,
    Products,
)
from plaid.exceptions import ApiException


def _get_environment() -> Environment:
    env_name = os.getenv("PLAID_ENV", "sandbox").lower()
    return {
        "sandbox": Environment.Sandbox,
        "development": Environment.Development,
        "production": Environment.Production,
    }.get(env_name, Environment.Sandbox)


def _get_credentials() -> Tuple[str, str]:
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    if not client_id or not secret:
        raise RuntimeError(
            "PLAID_CLIENT_ID and PLAID_SECRET must be set in the environment."
        )
    return client_id, secret


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


def create_link_token(user_id: str, products: Iterable[str]) -> str:
    """
    Generate a link_token for the Link flow.
    """
    client = get_plaid_client()
    requested_products = [Products(p) for p in products]

    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        client_name="Finity",
        products=requested_products,
        country_codes=[CountryCode("US")],
        language="en",
    )

    try:
        response = client.link_token_create(request)
    except ApiException as exc:
        raise RuntimeError(f"Plaid link_token creation failed: {exc}") from exc

    return response.link_token


def exchange_public_token(public_token: str) -> Tuple[str, str]:
    """
    Exchange a public_token for an access_token and item_id.
    """
    client = get_plaid_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)

    try:
        response = client.item_public_token_exchange(request)
    except ApiException as exc:
        raise RuntimeError(f"Plaid token exchange failed: {exc}") from exc

    return response.access_token, response.item_id


__all__ = ["get_plaid_client", "create_link_token", "exchange_public_token"]
