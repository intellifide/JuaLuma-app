# Updated 2026-01-21 00:05 CST
"""Bitquery-backed crypto history service."""

from __future__ import annotations

import json
import logging

from backend.core.config import settings
from backend.integrations.bitquery.adapters import (
    fetch_bitcoin_history,
    fetch_evm_history,
    fetch_solana_history,
    fetch_tron_history,
    fetch_xrp_history,
)
from backend.integrations.bitquery.adapters import (
    fetch_cardano_history as fetch_cardano_history_bitquery,
)
from backend.integrations.blockfrost.cardano import (
    fetch_cardano_history_blockfrost,
)
from backend.models.account import Account
from backend.services.connectors import NormalizedTransaction

logger = logging.getLogger(__name__)

EVM_NETWORKS = {
    "eip155:1": "ethereum",
    "eip155:56": "bsc",
    "eip155:137": "polygon",
}


class BitqueryUnavailableError(RuntimeError):
    pass


def _load_account_identity(account: Account) -> tuple[str, str]:
    if not account.secret_ref:
        raise ValueError("Account is missing Web3 connection details")
    try:
        payload = json.loads(account.secret_ref)
    except json.JSONDecodeError as exc:
        raise ValueError("Account Web3 connection payload is invalid") from exc

    address = payload.get("address")
    if not address:
        raise ValueError("Account Web3 address is missing")

    chain = payload.get("chain")
    if not chain:
        chain_id = payload.get("chain_id") or 1
        chain = f"eip155:{chain_id}"

    return address, chain.lower()


def fetch_crypto_history(account: Account) -> list[NormalizedTransaction]:
    address, chain = _load_account_identity(account)
    namespace, _reference = chain.split(":", 1)

    if namespace != "cardano" and (
        not settings.bitquery_api_key or not settings.bitquery_url
    ):
        raise BitqueryUnavailableError("Bitquery credentials are not configured")

    try:
        if namespace == "eip155":
            network = EVM_NETWORKS.get(chain)
            if not network:
                raise BitqueryUnavailableError(f"Unsupported EVM chain: {chain}")
            return fetch_evm_history(address, network)
        if namespace == "bip122":
            return fetch_bitcoin_history(address)
        if namespace == "solana":
            return fetch_solana_history(address)
        if namespace == "cardano":
            try:
                return fetch_cardano_history_bitquery(address)
            except Exception as bitquery_error:
                logger.warning(
                    "Bitquery failed for Cardano address %s, falling back to Blockfrost: %s",
                    address,
                    bitquery_error,
                )
                return fetch_cardano_history_blockfrost(address)
        if namespace == "ripple":
            return fetch_xrp_history(address)
        if namespace == "tron":
            return fetch_tron_history(address)
    except BitqueryUnavailableError:
        raise
    except Exception as exc:
        logger.warning("Bitquery history fetch failed for %s: %s", chain, exc)
        raise BitqueryUnavailableError(str(exc)) from exc

    raise BitqueryUnavailableError(f"Unsupported chain for Bitquery: {chain}")


__all__ = ["fetch_crypto_history", "BitqueryUnavailableError"]
