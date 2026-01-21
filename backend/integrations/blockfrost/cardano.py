# Updated 2026-01-21 00:05 CST
"""Blockfrost-based Cardano history fetcher."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from backend.integrations.blockfrost.client import blockfrost_get
from backend.services.connectors import NormalizedTransaction, normalize_transaction

ADA_UNIT = Decimal("1000000")
PAGE_SIZE = 100


def _matches_address(value: str | None, address: str) -> bool:
    if not value:
        return False
    return str(value).lower() == address.lower()


def _sum_lovelace(items: list[dict], address: str, *, match_address: bool) -> int:
    total = 0
    for item in items:
        addr = item.get("address")
        if _matches_address(addr, address) != match_address:
            continue
        for amount in item.get("amount") or []:
            if amount.get("unit") != "lovelace":
                continue
            try:
                total += int(amount.get("quantity") or 0)
            except (TypeError, ValueError):
                continue
    return total


def _extract_counterparty(items: list[dict], address: str) -> str | None:
    for item in items:
        addr = item.get("address")
        if addr and not _matches_address(addr, address):
            return str(addr)
    return None


def _parse_block_time(value: int | str | None) -> datetime:
    try:
        return datetime.fromtimestamp(int(value or 0), tz=UTC)
    except (TypeError, ValueError):
        return datetime.now(UTC)


def fetch_cardano_history_blockfrost(address: str) -> list[NormalizedTransaction]:
    transactions: list[NormalizedTransaction] = []
    page = 1

    while True:
        tx_entries = blockfrost_get(
            f"/addresses/{address}/transactions",
            params={"order": "asc", "count": PAGE_SIZE, "page": page},
        )
        if not tx_entries:
            break

        for entry in tx_entries:
            tx_hash = entry.get("tx_hash")
            if not tx_hash:
                continue

            tx_detail = blockfrost_get(f"/txs/{tx_hash}")
            utxos = blockfrost_get(f"/txs/{tx_hash}/utxos")
            inputs = utxos.get("inputs") or []
            outputs = utxos.get("outputs") or []

            has_input = any(
                _matches_address(item.get("address"), address) for item in inputs
            )
            has_output = any(
                _matches_address(item.get("address"), address) for item in outputs
            )
            if not has_input and not has_output:
                continue

            if has_input:
                direction = "outflow"
                counterparty = _extract_counterparty(outputs, address)
                amount_lovelace = _sum_lovelace(
                    outputs, address, match_address=False
                )
                if amount_lovelace == 0:
                    amount_lovelace = _sum_lovelace(
                        inputs, address, match_address=True
                    )
            else:
                direction = "inflow"
                counterparty = _extract_counterparty(inputs, address)
                amount_lovelace = _sum_lovelace(outputs, address, match_address=True)

            if amount_lovelace == 0:
                continue

            payload = {
                "tx_id": str(tx_hash),
                "account_id": address,
                "amount": Decimal(str(amount_lovelace)) / ADA_UNIT,
                "currency_code": "ADA",
                "timestamp": _parse_block_time(tx_detail.get("block_time")),
                "merchant_name": None,
                "counterparty": counterparty,
                "type": "transfer",
                "direction": direction,
                "on_chain_units": str(amount_lovelace),
                "on_chain_symbol": "ADA",
                "raw": {
                    "tx": tx_detail,
                    "utxos": utxos,
                    "fee": tx_detail.get("fees"),
                },
            }
            record = normalize_transaction(payload)
            transactions.append(
                NormalizedTransaction(
                    **{
                        **record.__dict__,
                        "on_chain_units": str(amount_lovelace),
                        "raw": payload["raw"],
                    }
                )
            )

        page += 1

    return transactions


__all__ = ["fetch_cardano_history_blockfrost"]
