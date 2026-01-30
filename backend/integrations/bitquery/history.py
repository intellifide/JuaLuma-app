"""Paged Bitquery transfer fetching and normalization."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from backend.integrations.bitquery.client import bitquery_query
from backend.services.connectors import NormalizedTransaction, normalize_transaction

CHAIN_SYMBOL_FALLBACK = {
    "ethereum": "ETH",
    "bsc": "BNB",
    "polygon": "MATIC",
    "bitcoin": "BTC",
    "solana": "SOL",
    "cardano": "ADA",
    "xrp": "XRP",
    "tron": "TRX",
}
DATASET_BY_CHAIN = {
    "bitcoin": "Bitcoin",
    "solana": "Solana",
    "cardano": "Cardano",
    "xrp": "Ripple",
    "tron": "Tron",
}
EVM_CHAIN_CODES = {"ethereum", "bsc", "polygon"}


def _parse_timestamp(value: str | int | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    if isinstance(value, int):
        return datetime.fromtimestamp(value, tz=UTC)
    text = str(value)
    if text.isdigit():
        return datetime.fromtimestamp(int(text), tz=UTC)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return datetime.now(UTC)


def _extract_address(payload: dict | str | None) -> str | None:
    if isinstance(payload, dict):
        if "address" in payload:
            return payload.get("address")
        if "Address" in payload:
            return payload.get("Address")
        return payload.get("id")
    if payload is None:
        return None
    return str(payload)


def _extract_block_time(row: dict) -> str | None:
    block = row.get("Block") or row.get("block") or {}
    if isinstance(block, dict):
        if block.get("Time"):
            return block.get("Time")
        timestamp = block.get("timestamp") or {}
        if isinstance(timestamp, dict):
            return timestamp.get("time")
        if timestamp:
            return str(timestamp)
        if block.get("time"):
            return block.get("time")
    if block:
        return str(block)
    return None


def _extract_rows(root: dict, chain_code: str) -> list[dict]:
    transfers = root.get("Transfers") or root.get("transfers") or []
    payments = root.get("Payments") or root.get("payments") or []
    if chain_code == "xrp" and payments:
        return list(payments)
    return list(transfers or payments)


def _page_size_for_root(root: dict, chain_code: str) -> int:
    transfers = root.get("Transfers") or root.get("transfers") or []
    payments = root.get("Payments") or root.get("payments") or []
    if chain_code == "xrp" and payments:
        return len(payments)
    return len(transfers or payments)


def _extract_transfer_payload(row: dict) -> dict:
    if "Transfer" in row:
        return row.get("Transfer") or {}
    if "Payment" in row:
        return row.get("Payment") or {}
    return row


def _resolve_direction(
    sender: str | None, receiver: str | None, address: str
) -> tuple[str | None, str | None]:
    if sender and sender.lower() == address.lower():
        return "outflow", receiver
    if receiver and receiver.lower() == address.lower():
        return "inflow", sender
    return None, None


def _normalize_transfer_row(
    row: dict, address: str, chain_code: str
) -> NormalizedTransaction | None:
    transfer = _extract_transfer_payload(row)
    sender = _extract_address(transfer.get("sender") or transfer.get("Sender"))
    receiver = _extract_address(transfer.get("receiver") or transfer.get("Receiver"))
    direction, counterparty = _resolve_direction(sender, receiver, address)
    if direction is None:
        return None

    currency = transfer.get("currency") or transfer.get("Currency") or {}
    symbol = currency.get("symbol") or currency.get("Symbol") or CHAIN_SYMBOL_FALLBACK.get(chain_code, "")
    decimals_raw = currency.get("decimals") if "decimals" in currency else currency.get("Decimals")
    try:
        decimals = int(decimals_raw) if decimals_raw is not None else 0
    except (TypeError, ValueError):
        decimals = 0

    raw_amount = Decimal(str(transfer.get("amount") or transfer.get("Amount") or "0"))
    divisor = Decimal(10) ** decimals if decimals else Decimal(1)
    amount = raw_amount / divisor

    tx_payload = transfer.get("transaction") or transfer.get("Transaction") or {}
    if chain_code == "solana":
        tx_id = (
            tx_payload.get("signature")
            or tx_payload.get("Signature")
            or tx_payload.get("hash")
            or tx_payload.get("Hash")
        )
    else:
        tx_id = (
            tx_payload.get("hash")
            or tx_payload.get("Hash")
            or tx_payload.get("signature")
            or tx_payload.get("Signature")
        )
    if not tx_id:
        row_tx = row.get("Transaction") or row.get("transaction") or {}
        tx_id = (
            row_tx.get("Hash")
            or row_tx.get("hash")
            or row_tx.get("Signature")
            or row_tx.get("signature")
        )
    if not tx_id:
        tx_id = str(transfer.get("signature") or row.get("signature") or "")
    if not tx_id:
        return None

    timestamp_value = _extract_block_time(row)
    timestamp = _parse_timestamp(timestamp_value)

    payload = {
        "tx_id": tx_id or "",
        "account_id": address,
        "amount": amount,
        "currency_code": symbol,
        "timestamp": timestamp,
        "merchant_name": None,
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": str(raw_amount),
        "on_chain_symbol": symbol,
        "raw": row,
    }
    record = normalize_transaction(payload)
    return NormalizedTransaction(
        **{
            **record.__dict__,
            "on_chain_units": str(raw_amount),
            "raw": row,
        }
    )


def fetch_transfers_generic(
    query: str,
    *,
    network: str | None,
    address: str,
    chain_code: str,
    page_size: int = 100,
    max_pages: int = 1000,
) -> list[NormalizedTransaction]:
    if page_size <= 0:
        raise ValueError("page_size must be positive")

    transactions: list[NormalizedTransaction] = []
    offset = 0

    for _page in range(max_pages):
        variables = {"address": address, "limit": page_size, "offset": offset}
        if network:
            variables["network"] = network

        data = bitquery_query(query, variables=variables)
        if "chain" in data:
            root = data["chain"] or {}
        else:
            dataset = DATASET_BY_CHAIN.get(chain_code)
            if not dataset and chain_code in EVM_CHAIN_CODES:
                dataset = "EVM"
            root = data.get(dataset) if dataset else None
            if root is None and len(data) == 1:
                root = next(iter(data.values()))
            if root is None:
                root = {}
        rows = _extract_rows(root, chain_code)
        if not rows:
            break

        for row in rows:
            normalized = _normalize_transfer_row(row, address, chain_code)
            if normalized:
                transactions.append(normalized)

        page_len = _page_size_for_root(root, chain_code)
        if page_len < page_size:
            break
        offset += page_size

    if chain_code == "bitcoin":
        return _aggregate_utxo_transactions(transactions)
    return transactions


def _aggregate_utxo_transactions(
    transactions: list[NormalizedTransaction],
) -> list[NormalizedTransaction]:
    buckets: dict[tuple[str, str, str], NormalizedTransaction] = {}
    for txn in transactions:
        base_id = txn.tx_id.split(":")[0] if txn.tx_id else ""
        if not base_id:
            continue
        key = (base_id, txn.direction, txn.currency_code)
        if key not in buckets:
            buckets[key] = NormalizedTransaction(
                **{**txn.__dict__, "tx_id": base_id}
            )
            continue
        existing = buckets[key]
        buckets[key] = NormalizedTransaction(
            **{
                **existing.__dict__,
                "amount": existing.amount + txn.amount,
            }
        )
    return list(buckets.values())


__all__ = ["fetch_transfers_generic"]
