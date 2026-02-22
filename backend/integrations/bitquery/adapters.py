"""Per-chain Bitquery adapters."""

from backend.integrations.bitquery.history import fetch_transfers_generic
from backend.integrations.bitquery.queries import (
    BITCOIN_TRANSFERS_QUERY,
    CARDANO_TRANSFERS_QUERY,
    EVM_TRANSFERS_QUERY,
    SOLANA_TRANSFERS_QUERY,
    TRON_TRANSFERS_QUERY,
    XRP_PAYMENTS_QUERY,
)
from backend.services.connectors import NormalizedTransaction


def fetch_evm_history(address: str, network: str) -> list[NormalizedTransaction]:
    """Fetch EVM history for a specific Bitquery network."""
    return fetch_transfers_generic(
        EVM_TRANSFERS_QUERY,
        network=network,
        address=address,
        chain_code=network,
    )


def fetch_bitcoin_history(address: str) -> list[NormalizedTransaction]:
    return fetch_transfers_generic(
        BITCOIN_TRANSFERS_QUERY,
        network=None,
        address=address,
        chain_code="bitcoin",
    )


def fetch_solana_history(address: str) -> list[NormalizedTransaction]:
    return fetch_transfers_generic(
        SOLANA_TRANSFERS_QUERY,
        network=None,
        address=address,
        chain_code="solana",
    )


def fetch_cardano_history(address: str) -> list[NormalizedTransaction]:
    return fetch_transfers_generic(
        CARDANO_TRANSFERS_QUERY,
        network=None,
        address=address,
        chain_code="cardano",
    )


def fetch_xrp_history(address: str) -> list[NormalizedTransaction]:
    return fetch_transfers_generic(
        XRP_PAYMENTS_QUERY,
        network=None,
        address=address,
        chain_code="xrp",
    )


def fetch_tron_history(address: str) -> list[NormalizedTransaction]:
    return fetch_transfers_generic(
        TRON_TRANSFERS_QUERY,
        network=None,
        address=address,
        chain_code="tron",
    )


__all__ = [
    "fetch_evm_history",
    "fetch_bitcoin_history",
    "fetch_solana_history",
    "fetch_cardano_history",
    "fetch_xrp_history",
    "fetch_tron_history",
]
