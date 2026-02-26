from __future__ import annotations

import importlib
import json
import logging
import random
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from backend.core.config import settings
from backend.services.connectors import NormalizedTransaction, normalize_transaction

logger = logging.getLogger(__name__)

EVM_PAGE_SIZE = 50
UTXO_PAGE_SIZE = 50
SOLANA_PAGE_SIZE = 50
XRP_PAGE_SIZE = 50
TRON_PAGE_SIZE = 200

RIPPLE_EPOCH_OFFSET_SECONDS = 946684800

EVM_CHAIN_MAP = {
    "eip155:1": ("ethereum-mainnet", "ETH"),
    "eip155:56": ("bsc-mainnet", "BNB"),
    "eip155:137": ("polygon-mainnet", "MATIC"),
}

NATIVE_SYMBOLS = {
    "bip122:000000000019d6689c085ae165831e93": "BTC",
    "solana:5eykt6UsFvXYuy2aiUB66XX7hsgnSSXq": "SOL",
    "ripple:mainnet": "XRP",
    "cardano:mainnet": "ADA",
    "tron:mainnet": "TRX",
}


class ProviderOverloaded(RuntimeError):
    pass


class ProviderError(RuntimeError):
    pass


@dataclass
class Web3HistoryResult:
    transactions: list[NormalizedTransaction]
    next_cursor: str | None
    update_cursor: bool


def _load_cursor(cursor: str | None) -> dict[str, Any]:
    if not cursor:
        return {}
    try:
        data = json.loads(cursor)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return {}


def _dump_cursor(payload: dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"))


def _coerce_decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except Exception:
        return Decimal("0")


def _parse_timestamp(value: Any) -> datetime:
    if value is None:
        return datetime.now(UTC)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    if isinstance(value, int | float):
        if value > 10_000_000_000:
            return datetime.fromtimestamp(float(value) / 1000.0, tz=UTC)
        return datetime.fromtimestamp(float(value), tz=UTC)
    text = str(value).strip()
    if not text:
        return datetime.now(UTC)
    if text.isdigit():
        return _parse_timestamp(int(text))
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return datetime.now(UTC)


def _parse_ripple_timestamp(value: Any) -> datetime:
    if value is None:
        return datetime.now(UTC)
    if isinstance(value, int | float) or str(value).isdigit():
        raw = int(value)
        unix_ts = raw + RIPPLE_EPOCH_OFFSET_SECONDS if raw < RIPPLE_EPOCH_OFFSET_SECONDS else raw
        return datetime.fromtimestamp(unix_ts, tz=UTC)
    return _parse_timestamp(value)


def _tatum_headers() -> dict[str, str]:
    if not settings.tatum_api_key:
        raise ProviderError("TATUM_API_KEY is not configured")
    return {"x-api-key": settings.tatum_api_key}


def _tatum_base_url() -> str:
    base = (settings.tatum_base_url or "").strip()
    if not base:
        raise ProviderError("TATUM_BASE_URL is not configured")
    return base.rstrip("/")


def _retry_sleep(attempt: int) -> None:
    multipliers = [1, 3, 7]
    idx = min(max(attempt - 1, 0), len(multipliers) - 1)
    base_ms = max(1, int(settings.tatum_retry_base_backoff_ms))
    backoff_ms = base_ms * multipliers[idx]
    jitter_ms = int(backoff_ms * 0.15 * random.random())
    time.sleep((backoff_ms + jitter_ms) / 1000.0)


def _request_json(
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int | None = None,
) -> tuple[Any, dict[str, str]]:
    requests = importlib.import_module("requests")
    attempts = max(1, int(settings.tatum_retry_max_attempts))
    timeout_seconds = timeout or max(1, int(settings.tatum_timeout_seconds))
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            if method.upper() == "POST":
                resp = requests.post(
                    url,
                    params=params,
                    json=json_body,
                    headers=headers,
                    timeout=timeout_seconds,
                )
            else:
                resp = requests.get(
                    url,
                    params=params,
                    headers=headers,
                    timeout=timeout_seconds,
                )
        except Exception as exc:
            last_error = exc
            if attempt >= attempts:
                raise ProviderError(f"Tatum request failed: {exc}") from exc
            _retry_sleep(attempt)
            continue

        if resp.status_code == 429:
            if attempt >= attempts:
                raise ProviderOverloaded("Tatum rate limit hit")
            _retry_sleep(attempt)
            continue

        if 500 <= resp.status_code <= 599:
            if attempt >= attempts:
                raise ProviderError(f"Tatum returned {resp.status_code}: {resp.text}")
            _retry_sleep(attempt)
            continue

        if not resp.ok:
            raise ProviderError(f"Tatum returned {resp.status_code}: {resp.text}")

        try:
            return resp.json(), dict(resp.headers or {})
        except Exception as exc:
            raise ProviderError(f"Tatum returned invalid JSON: {exc}") from exc

    if last_error:
        raise ProviderError(str(last_error)) from last_error
    raise ProviderError("Unknown Tatum request failure")


def _tatum_get(
    path: str,
    *,
    params: dict[str, Any] | None = None,
    timeout: int | None = None,
) -> tuple[Any, dict[str, str]]:
    return _request_json(
        "GET",
        f"{_tatum_base_url()}{path}",
        params=params,
        headers=_tatum_headers(),
        timeout=timeout,
    )


def _tatum_rpc(
    network: str,
    body: dict[str, Any],
    *,
    timeout: int | None = None,
) -> tuple[Any, dict[str, str]]:
    if not settings.tatum_api_key:
        raise ProviderError("TATUM_API_KEY is not configured")
    url = f"{_tatum_base_url()}/v3/blockchain/node/{network}/{settings.tatum_api_key}"
    return _request_json(
        "POST",
        url,
        json_body=body,
        headers={"Content-Type": "application/json"},
        timeout=timeout,
    )


def fetch_tatum_history(address: str, chain: str, cursor: str | None) -> Web3HistoryResult:
    if chain in EVM_CHAIN_MAP:
        return _fetch_evm_history(address, chain, cursor)
    if chain.startswith("bip122:"):
        return _fetch_bitcoin_history(address, cursor)
    if chain.startswith("solana:"):
        return _fetch_solana_history(address, cursor)
    if chain.startswith("ripple:"):
        return _fetch_xrp_history(address, cursor)
    if chain.startswith("cardano:"):
        return _fetch_cardano_history(address, cursor)
    if chain.startswith("tron:"):
        return _fetch_tron_history(address, cursor)
    raise ProviderError(f"Unsupported chain for Tatum history: {chain}")


def _normalize_evm_history_tx(
    tx: dict[str, Any],
    address: str,
    chain: str,
    idx: int,
) -> NormalizedTransaction:
    _network, native_symbol = EVM_CHAIN_MAP[chain]
    tx_hash = str(tx.get("hash") or "")
    tx_type = str(tx.get("transactionType") or "native")
    subtype = str(tx.get("transactionSubtype") or "incoming").lower()
    token_address = str(tx.get("tokenAddress") or "")
    direction = "outflow" if subtype in {"outgoing", "outflow"} else "inflow"
    currency_code = token_address or native_symbol
    payload = {
        "tx_id": f"{tx_hash}:{tx_type}:{token_address or 'native'}:{idx}",
        "account_id": address,
        "amount": _coerce_decimal(tx.get("amount")),
        "currency_code": currency_code,
        "timestamp": _parse_timestamp(tx.get("timestamp")),
        "counterparty": tx.get("counterAddress"),
        "type": "transfer",
        "direction": direction,
        "on_chain_units": _coerce_decimal(tx.get("amount")),
        "on_chain_symbol": native_symbol if not token_address else token_address,
        "raw": tx,
    }
    return normalize_transaction(payload)


def _fetch_evm_history(address: str, chain: str, cursor: str | None) -> Web3HistoryResult:
    tatum_chain, _symbol = EVM_CHAIN_MAP[chain]
    cursor_data = _load_cursor(cursor)
    offset = int(cursor_data.get("offset") or 0)
    params = {
        "chain": tatum_chain,
        "addresses": address,
        "pageSize": EVM_PAGE_SIZE,
        "offset": offset,
    }
    payload, _headers = _tatum_get(
        "/v4/data/transaction/history", params=params, timeout=max(15, settings.tatum_timeout_seconds)
    )
    result = payload.get("result") if isinstance(payload, dict) else None
    if not isinstance(result, list):
        raise ProviderError(f"Unexpected EVM history payload: {payload}")
    transactions = [
        _normalize_evm_history_tx(tx, address, chain, idx)
        for idx, tx in enumerate(result)
    ]
    next_cursor = (
        _dump_cursor({"offset": offset + EVM_PAGE_SIZE})
        if len(result) >= EVM_PAGE_SIZE
        else None
    )
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


def _extract_utxo_address(item: Any) -> str:
    if not isinstance(item, dict):
        return ""
    coin = item.get("coin")
    if isinstance(coin, dict) and coin.get("address"):
        return str(coin.get("address"))
    return str(item.get("address") or "")


def _extract_utxo_value(item: Any) -> int:
    if not isinstance(item, dict):
        return 0
    coin = item.get("coin")
    if isinstance(coin, dict) and coin.get("value") is not None:
        try:
            return int(coin.get("value"))
        except Exception:
            return 0
    raw = item.get("value")
    if raw is None:
        return 0
    try:
        return int(raw)
    except Exception:
        return 0


def _normalize_btc_transaction(
    tx: dict[str, Any],
    address: str,
    idx: int,
) -> NormalizedTransaction | None:
    inputs = tx.get("inputs") or []
    outputs = tx.get("outputs") or []
    total_in = sum(
        _extract_utxo_value(i) for i in inputs if _extract_utxo_address(i) == address
    )
    total_out = sum(
        _extract_utxo_value(o) for o in outputs if _extract_utxo_address(o) == address
    )
    net = total_out - total_in
    if net == 0:
        return None
    direction = "inflow" if net > 0 else "outflow"
    payload = {
        "tx_id": f"{tx.get('hash') or ''}:{idx}",
        "account_id": address,
        "amount": Decimal(abs(net)) / Decimal("100000000"),
        "currency_code": "BTC",
        "timestamp": _parse_timestamp(tx.get("time")),
        "counterparty": None,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": Decimal(abs(net)),
        "on_chain_symbol": "BTC",
        "raw": tx,
    }
    return normalize_transaction(payload)


def _fetch_bitcoin_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    offset = int(cursor_data.get("offset") or 0)
    payload, _headers = _tatum_get(
        f"/v3/bitcoin/transaction/address/{address}",
        params={"pageSize": UTXO_PAGE_SIZE, "offset": offset},
        timeout=max(20, settings.tatum_timeout_seconds),
    )
    if not isinstance(payload, list):
        raise ProviderError(f"Unexpected BTC payload: {payload}")
    transactions: list[NormalizedTransaction] = []
    for idx, tx in enumerate(payload):
        normalized = _normalize_btc_transaction(tx, address, idx)
        if normalized:
            transactions.append(normalized)
    next_cursor = (
        _dump_cursor({"offset": offset + UTXO_PAGE_SIZE})
        if len(payload) >= UTXO_PAGE_SIZE
        else None
    )
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


def _extract_cardano_lovelace(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, int | float) or str(value).isdigit():
        try:
            return int(value)
        except Exception:
            return 0
    if isinstance(value, list):
        total = 0
        for entry in value:
            if not isinstance(entry, dict):
                continue
            unit = str(entry.get("unit") or "").lower()
            qty_raw = entry.get("quantity")
            if qty_raw is None:
                continue
            qty = _coerce_decimal(qty_raw)
            if unit == "lovelace":
                total += int(qty)
            elif unit == "ada":
                total += int(qty * Decimal("1000000"))
        return total
    if isinstance(value, dict):
        if "coin" in value:
            return _extract_cardano_lovelace(value.get("coin"))
        if "amount" in value:
            return _extract_cardano_lovelace(value.get("amount"))
        if "value" in value:
            return _extract_cardano_lovelace(value.get("value"))
        if "quantity" in value:
            return _extract_cardano_lovelace(value.get("quantity"))
        if "lovelace" in value:
            return _extract_cardano_lovelace(value.get("lovelace"))
    return 0


def _normalize_cardano_transaction(
    tx: dict[str, Any],
    address: str,
    idx: int,
) -> NormalizedTransaction | None:
    inputs = tx.get("inputs") or []
    outputs = tx.get("outputs") or []
    if isinstance(inputs, list) and isinstance(outputs, list):
        total_in = sum(
            _extract_cardano_lovelace(item)
            for item in inputs
            if str((item or {}).get("address") or _extract_utxo_address(item)) == address
        )
        total_out = sum(
            _extract_cardano_lovelace(item)
            for item in outputs
            if str((item or {}).get("address") or _extract_utxo_address(item)) == address
        )
        net = total_out - total_in
    else:
        net = _extract_cardano_lovelace(tx.get("amount"))
        direction_hint = str(tx.get("type") or tx.get("transactionType") or "").lower()
        if direction_hint in {"outgoing", "withdrawal", "outflow"}:
            net = -abs(net)
        elif direction_hint in {"incoming", "deposit", "inflow"}:
            net = abs(net)

    if net == 0:
        return None

    direction = "inflow" if net > 0 else "outflow"
    tx_hash = tx.get("hash") or tx.get("tx_hash") or tx.get("txHash") or ""
    timestamp = (
        tx.get("blockTime")
        or tx.get("block_time")
        or tx.get("time")
        or tx.get("timestamp")
    )
    payload = {
        "tx_id": f"{tx_hash}:{idx}",
        "account_id": address,
        "amount": Decimal(abs(net)) / Decimal("1000000"),
        "currency_code": "ADA",
        "timestamp": _parse_timestamp(timestamp),
        "counterparty": None,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": Decimal(abs(net)),
        "on_chain_symbol": "ADA",
        "raw": tx,
    }
    return normalize_transaction(payload)


def _fetch_cardano_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    offset = int(cursor_data.get("offset") or 0)
    payload, _headers = _tatum_get(
        f"/v3/ada/transaction/address/{address}",
        params={"pageSize": UTXO_PAGE_SIZE, "offset": offset},
        timeout=max(20, settings.tatum_timeout_seconds),
    )
    if not isinstance(payload, list):
        raise ProviderError(f"Unexpected Cardano payload: {payload}")
    transactions: list[NormalizedTransaction] = []
    for idx, tx in enumerate(payload):
        normalized = _normalize_cardano_transaction(tx, address, idx)
        if normalized:
            transactions.append(normalized)
    next_cursor = (
        _dump_cursor({"offset": offset + UTXO_PAGE_SIZE})
        if len(payload) >= UTXO_PAGE_SIZE
        else None
    )
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


def _normalize_tron_transaction(
    tx: dict[str, Any],
    address: str,
    tx_idx: int,
) -> list[NormalizedTransaction]:
    raw_data = tx.get("rawData") or tx.get("raw_data") or {}
    contracts = raw_data.get("contract") or []
    tx_id = tx.get("txID") or tx.get("hash") or ""
    timestamp = _parse_timestamp(raw_data.get("timestamp") or tx.get("timestamp"))
    normalized: list[NormalizedTransaction] = []

    for contract_idx, contract in enumerate(contracts):
        value = ((contract or {}).get("parameter") or {}).get("value") or {}
        owner = value.get("ownerAddressBase58") or value.get("owner_address") or tx.get("ownerAddress")
        to_addr = value.get("toAddressBase58") or value.get("to_address") or tx.get("toAddress")
        if address not in {owner, to_addr}:
            continue
        amount_raw = value.get("amount") or tx.get("amount")
        amount_sun = _coerce_decimal(amount_raw)
        if amount_sun <= 0:
            continue
        symbol = "TRX"
        asset_name = value.get("assetNameUtf8") or value.get("asset_name")
        if asset_name:
            symbol = str(asset_name)
        amount = amount_sun / Decimal("1000000") if symbol == "TRX" else amount_sun
        direction = "outflow" if owner == address else "inflow"
        counterparty = to_addr if direction == "outflow" else owner
        payload = {
            "tx_id": f"{tx_id}:{tx_idx}:{contract_idx}",
            "account_id": address,
            "amount": amount,
            "currency_code": symbol,
            "timestamp": timestamp,
            "counterparty": counterparty,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": amount_sun,
            "on_chain_symbol": symbol,
            "raw": tx,
        }
        normalized.append(normalize_transaction(payload))
    return normalized


def _fetch_tron_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    params: dict[str, Any] = {"pageSize": TRON_PAGE_SIZE}
    if cursor_data.get("next"):
        params["next"] = cursor_data["next"]
    payload, _headers = _tatum_get(
        f"/v3/tron/transaction/account/{address}",
        params=params,
        timeout=max(20, settings.tatum_timeout_seconds),
    )
    if not isinstance(payload, dict):
        raise ProviderError(f"Unexpected Tron payload: {payload}")
    txs = payload.get("transactions") or []
    if not isinstance(txs, list):
        raise ProviderError(f"Unexpected Tron transactions payload: {payload}")
    transactions: list[NormalizedTransaction] = []
    for idx, tx in enumerate(txs):
        transactions.extend(_normalize_tron_transaction(tx, address, idx))
    next_token = payload.get("next")
    next_cursor = _dump_cursor({"next": next_token}) if next_token else None
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


def _normalize_solana_native_transfer(
    tx_id: str,
    address: str,
    amount_lamports: Decimal,
    timestamp: datetime,
    counterparty: str | None,
    direction: str,
    raw: dict[str, Any],
    suffix: str,
) -> NormalizedTransaction:
    amount_sol = amount_lamports / Decimal("1000000000")
    payload = {
        "tx_id": f"{tx_id}:native:{suffix}",
        "account_id": address,
        "amount": amount_sol,
        "currency_code": "SOL",
        "timestamp": timestamp,
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": amount_lamports,
        "on_chain_symbol": "SOL",
        "raw": raw,
    }
    return normalize_transaction(payload)


def _normalize_solana_token_transfer(
    tx_id: str,
    address: str,
    mint: str,
    raw_amount: Decimal,
    decimals: int,
    timestamp: datetime,
    counterparty: str | None,
    direction: str,
    raw: dict[str, Any],
    suffix: str,
) -> NormalizedTransaction:
    divisor = Decimal(10) ** decimals if decimals else Decimal(1)
    amount = raw_amount / divisor
    payload = {
        "tx_id": f"{tx_id}:token:{suffix}",
        "account_id": address,
        "amount": amount,
        "currency_code": mint,
        "timestamp": timestamp,
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": raw_amount,
        "on_chain_symbol": mint,
        "raw": raw,
    }
    return normalize_transaction(payload)


def _parse_solana_transaction(
    tx: dict[str, Any], address: str
) -> list[NormalizedTransaction]:
    meta = tx.get("meta") or {}
    message = tx.get("transaction", {}).get("message", {})
    keys = message.get("accountKeys") or []
    if keys and isinstance(keys[0], dict):
        keys = [entry.get("pubkey") for entry in keys]

    tx_id = str(tx.get("transaction", {}).get("signatures", [""])[0])
    timestamp = _parse_timestamp(tx.get("blockTime"))
    transactions: list[NormalizedTransaction] = []

    if address in keys:
        idx = keys.index(address)
        pre_balances = meta.get("preBalances") or []
        post_balances = meta.get("postBalances") or []
        if idx < len(pre_balances) and idx < len(post_balances):
            diff = Decimal(post_balances[idx]) - Decimal(pre_balances[idx])
            if diff != 0:
                direction = "inflow" if diff > 0 else "outflow"
                transactions.append(
                    _normalize_solana_native_transfer(
                        tx_id=tx_id,
                        address=address,
                        amount_lamports=abs(diff),
                        timestamp=timestamp,
                        counterparty=None,
                        direction=direction,
                        raw=tx,
                        suffix="0",
                    )
                )

    pre_tokens = meta.get("preTokenBalances") or []
    post_tokens = meta.get("postTokenBalances") or []
    token_map: dict[str, dict[str, Decimal | int]] = {}
    for entry in pre_tokens:
        if entry.get("owner") != address:
            continue
        mint = str(entry.get("mint") or "")
        amount = _coerce_decimal((entry.get("uiTokenAmount") or {}).get("amount"))
        decimals = int((entry.get("uiTokenAmount") or {}).get("decimals") or 0)
        token_map.setdefault(mint, {"pre": Decimal(0), "post": Decimal(0), "decimals": decimals})
        token_map[mint]["pre"] = amount
        token_map[mint]["decimals"] = decimals

    for entry in post_tokens:
        if entry.get("owner") != address:
            continue
        mint = str(entry.get("mint") or "")
        amount = _coerce_decimal((entry.get("uiTokenAmount") or {}).get("amount"))
        decimals = int((entry.get("uiTokenAmount") or {}).get("decimals") or 0)
        token_map.setdefault(mint, {"pre": Decimal(0), "post": Decimal(0), "decimals": decimals})
        token_map[mint]["post"] = amount
        token_map[mint]["decimals"] = decimals

    for idx, (mint, values) in enumerate(token_map.items()):
        pre = values.get("pre", Decimal(0))
        post = values.get("post", Decimal(0))
        diff = post - pre
        if diff == 0:
            continue
        direction = "inflow" if diff > 0 else "outflow"
        transactions.append(
            _normalize_solana_token_transfer(
                tx_id=tx_id,
                address=address,
                mint=mint,
                raw_amount=abs(diff),
                decimals=int(values.get("decimals", 0)),
                timestamp=timestamp,
                counterparty=None,
                direction=direction,
                raw=tx,
                suffix=str(idx),
            )
        )
    return transactions


def _fetch_solana_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    params: dict[str, Any] = {"limit": SOLANA_PAGE_SIZE}
    if cursor_data.get("before"):
        params["before"] = cursor_data["before"]

    signatures_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [address, params],
    }
    data, _headers = _tatum_rpc("solana-mainnet", signatures_req, timeout=max(20, settings.tatum_timeout_seconds))
    if isinstance(data, dict) and data.get("error"):
        raise ProviderError(f"Solana RPC error: {data['error']}")
    signatures = (data or {}).get("result") or []
    if not signatures:
        return Web3HistoryResult(transactions=[], next_cursor=None, update_cursor=True)

    transactions: list[NormalizedTransaction] = []
    for entry in signatures:
        signature = entry.get("signature")
        if not signature:
            continue
        tx_req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [signature, {"encoding": "json", "maxSupportedTransactionVersion": 0}],
        }
        tx_data, _headers = _tatum_rpc(
            "solana-mainnet", tx_req, timeout=max(20, settings.tatum_timeout_seconds)
        )
        if isinstance(tx_data, dict) and tx_data.get("error"):
            continue
        tx_result = (tx_data or {}).get("result")
        if not tx_result:
            continue
        transactions.extend(_parse_solana_transaction(tx_result, address))

    last_signature = signatures[-1].get("signature")
    next_cursor = (
        _dump_cursor({"before": last_signature})
        if len(signatures) >= SOLANA_PAGE_SIZE and last_signature
        else None
    )
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


def _normalize_xrp_amount(amount: Any) -> tuple[Decimal, str, Decimal | None]:
    if isinstance(amount, dict):
        value = _coerce_decimal(amount.get("value"))
        currency = str(amount.get("currency") or "XRP")
        return value, currency, None
    drops = _coerce_decimal(amount)
    return drops / Decimal("1000000"), "XRP", drops


def _fetch_xrp_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    account_tx_params: dict[str, Any] = {
        "account": address,
        "ledger_index_min": -1,
        "ledger_index_max": -1,
        "limit": XRP_PAGE_SIZE,
        "binary": False,
        "forward": False,
    }
    if cursor_data.get("marker") is not None:
        account_tx_params["marker"] = cursor_data["marker"]

    req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "account_tx",
        "params": [account_tx_params],
    }
    data, _headers = _tatum_rpc("ripple-mainnet", req, timeout=max(20, settings.tatum_timeout_seconds))
    if isinstance(data, dict) and data.get("error"):
        raise ProviderError(f"XRP RPC error: {data['error']}")

    result = (data or {}).get("result") or {}
    entries = result.get("transactions") or []
    transactions: list[NormalizedTransaction] = []
    for idx, entry in enumerate(entries):
        tx = entry.get("tx") or entry.get("tx_json") or {}
        if str(tx.get("TransactionType") or "") != "Payment":
            continue
        source = tx.get("Account")
        destination = tx.get("Destination")
        if address not in {source, destination}:
            continue
        direction = "outflow" if source == address else "inflow"
        counterparty = destination if direction == "outflow" else source
        amount_value, currency, on_chain_units = _normalize_xrp_amount(tx.get("Amount"))
        payload = {
            "tx_id": f"{tx.get('hash') or ''}:{idx}",
            "account_id": address,
            "amount": amount_value,
            "currency_code": currency or "XRP",
            "timestamp": _parse_ripple_timestamp(tx.get("date")),
            "counterparty": counterparty,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": on_chain_units,
            "on_chain_symbol": "XRP" if currency == "XRP" else currency,
            "raw": entry,
        }
        transactions.append(normalize_transaction(payload))

    next_marker = result.get("marker")
    next_cursor = _dump_cursor({"marker": next_marker}) if next_marker is not None else None
    return Web3HistoryResult(transactions=transactions, next_cursor=next_cursor, update_cursor=True)


__all__ = [
    "ProviderError",
    "ProviderOverloaded",
    "Web3HistoryResult",
    "fetch_tatum_history",
]
