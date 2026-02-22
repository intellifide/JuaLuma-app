from __future__ import annotations

import importlib
import json
import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from backend.core.config import settings
from backend.integrations.bitquery.client import bitquery_query
from backend.integrations.bitquery.queries import (
    BITCOIN_TRANSFERS_QUERY,
)
from backend.services.connectors import NormalizedTransaction, normalize_transaction

logger = logging.getLogger(__name__)

EVM_ACTIONS = ("txlist", "tokentx", "tokennfttx", "token1155tx")
EVM_PAGE_SIZE = 1000
SOLANA_PAGE_SIZE = 100
BITQUERY_PAGE_SIZE = 100
BLOCKCHAIN_COM_PAGE_SIZE = 100
XRPSCAN_PAGE_SIZE = 100
BLOCKFROST_PAGE_SIZE = 100
TRONSCAN_PAGE_SIZE = 100
TRONGRID_PAGE_SIZE = 200


class ProviderOverloaded(RuntimeError):
    pass


class ProviderError(RuntimeError):
    pass


@dataclass
class Web3HistoryResult:
    transactions: list[NormalizedTransaction]
    next_cursor: str | None
    update_cursor: bool


def _load_cursor(cursor: str | None) -> dict:
    if not cursor:
        return {}
    try:
        return json.loads(cursor)
    except json.JSONDecodeError:
        return {}


def _dump_cursor(payload: dict) -> str:
    return json.dumps(payload, separators=(",", ":"))


def _request_json(
    method: str,
    url: str,
    *,
    params: dict | None = None,
    json_body: dict | None = None,
    headers: dict | None = None,
    timeout: int = 10,
) -> tuple[dict, dict]:
    requests = importlib.import_module("requests")
    try:
        if method == "POST":
            resp = requests.post(
                url, params=params, json=json_body, headers=headers, timeout=timeout
            )
        else:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)
    except Exception as exc:
        raise ProviderError(f"Request failed: {exc}") from exc

    if resp.status_code == 429:
        raise ProviderOverloaded("Provider rate limit hit")
    if not resp.ok:
        raise ProviderError(f"Provider returned {resp.status_code}: {resp.text}")

    return resp.json(), resp.headers


def fetch_web3_history(
    address: str, chain: str, cursor: str | None
) -> Web3HistoryResult:
    if chain.startswith("eip155:"):
        return _fetch_evm_history(address, chain, cursor)
    if chain.startswith("solana:"):
        return _fetch_solana_history(address, cursor)
    if chain.startswith("bip122:"):
        return _fetch_bitcoin_history(address, cursor)
    if chain.startswith("ripple:"):
        return _fetch_xrp_history(address, cursor)
    if chain.startswith("cardano:"):
        return _fetch_cardano_history(address, cursor)
    if chain.startswith("tron:"):
        return _fetch_tron_history(address, cursor)
    return Web3HistoryResult(transactions=[], next_cursor=cursor, update_cursor=False)


def _evm_provider_for_chain(chain: str) -> tuple[str | None, str | None, str]:
    if chain == "eip155:1":
        return settings.etherscan_base_url, settings.etherscan_api_key, "ETH"
    if chain == "eip155:137":
        return settings.polygonscan_base_url, settings.polygonscan_api_key, "MATIC"
    if chain == "eip155:56":
        return settings.bscscan_base_url, settings.bscscan_api_key, "BNB"
    return None, None, "ETH"


def _parse_evm_timestamp(value: str | int | None) -> datetime:
    try:
        return datetime.fromtimestamp(int(value or 0), tz=UTC)
    except (TypeError, ValueError):
        return datetime.now(UTC)


def _evm_tx_id(tx_hash: str, action: str, index: str | None) -> str:
    suffix = index or "0"
    if action == "txlist":
        return f"{tx_hash}:native"
    return f"{tx_hash}:{action}:{suffix}"


def _normalize_evm_native(
    tx: dict, address: str, symbol: str
) -> NormalizedTransaction:
    tx_hash = str(tx.get("hash") or "")
    from_addr = str(tx.get("from") or "")
    to_addr = str(tx.get("to") or "")
    direction = "outflow" if from_addr.lower() == address.lower() else "inflow"
    counterparty = to_addr if direction == "outflow" else from_addr
    raw_value = Decimal(str(tx.get("value") or "0"))
    amount = raw_value / Decimal("1000000000000000000")
    payload = {
        "tx_id": _evm_tx_id(tx_hash, "txlist", None),
        "account_id": address,
        "amount": amount,
        "currency_code": symbol,
        "timestamp": _parse_evm_timestamp(tx.get("timeStamp")),
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": raw_value,
        "on_chain_symbol": symbol,
        "raw": tx,
    }
    return normalize_transaction(payload)


def _normalize_evm_token(
    tx: dict, address: str, symbol: str, action: str
) -> NormalizedTransaction:
    tx_hash = str(tx.get("hash") or "")
    from_addr = str(tx.get("from") or "")
    to_addr = str(tx.get("to") or "")
    direction = "outflow" if from_addr.lower() == address.lower() else "inflow"
    counterparty = to_addr if direction == "outflow" else from_addr
    token_decimals = int(tx.get("tokenDecimal") or 0)
    raw_value = Decimal(str(tx.get("value") or "0"))
    divisor = Decimal(10) ** token_decimals if token_decimals else Decimal(1)
    amount = raw_value / divisor
    currency_code = tx.get("contractAddress") or tx.get("tokenSymbol") or symbol
    on_chain_symbol = tx.get("tokenSymbol") or symbol
    index = str(tx.get("logIndex") or tx.get("tokenID") or "0")

    payload = {
        "tx_id": _evm_tx_id(tx_hash, action, index),
        "account_id": address,
        "amount": amount,
        "currency_code": currency_code,
        "timestamp": _parse_evm_timestamp(tx.get("timeStamp")),
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": raw_value,
        "on_chain_symbol": on_chain_symbol,
        "raw": tx,
    }
    return normalize_transaction(payload)


def _fetch_evm_history(
    address: str, chain: str, cursor: str | None
) -> Web3HistoryResult:
    base_url, api_key, symbol = _evm_provider_for_chain(chain)
    if not base_url or not api_key:
        logger.info("EVM provider disabled for %s (missing API key).", chain)
        return Web3HistoryResult(transactions=[], next_cursor=cursor, update_cursor=False)

    cursor_data = _load_cursor(cursor)
    action = cursor_data.get("action")
    if action not in EVM_ACTIONS:
        action = EVM_ACTIONS[0]
    page = int(cursor_data.get("page") or 1)

    params = {
        "module": "account",
        "action": action,
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "sort": "asc",
        "page": page,
        "offset": EVM_PAGE_SIZE,
        "apikey": api_key,
    }

    time.sleep(0.2)
    try:
        payload, _headers = _request_json("GET", base_url, params=params, timeout=15)
    except ProviderOverloaded:
        logger.warning("EVM provider rate limited; skipping sync.")
        return Web3HistoryResult(transactions=[], next_cursor=cursor, update_cursor=False)

    status = str(payload.get("status") or "")
    message = str(payload.get("message") or "")
    result = payload.get("result")
    if status == "0" and "rate limit" in message.lower():
        logger.warning("EVM provider rate limited; skipping sync.")
        return Web3HistoryResult(transactions=[], next_cursor=cursor, update_cursor=False)
    if status == "0" and isinstance(result, str):
        result = []
    if not isinstance(result, list):
        raise ProviderError(f"Unexpected EVM payload: {payload}")

    transactions: list[NormalizedTransaction] = []
    for tx in result:
        if action == "txlist":
            transactions.append(_normalize_evm_native(tx, address, symbol))
        else:
            transactions.append(_normalize_evm_token(tx, address, symbol, action))

    if len(result) >= EVM_PAGE_SIZE:
        next_cursor = _dump_cursor({"action": action, "page": page + 1})
    else:
        next_action_index = EVM_ACTIONS.index(action) + 1
        if next_action_index < len(EVM_ACTIONS):
            next_cursor = _dump_cursor({"action": EVM_ACTIONS[next_action_index], "page": 1})
        else:
            next_cursor = None

    return Web3HistoryResult(
        transactions=transactions,
        next_cursor=next_cursor,
        update_cursor=True,
    )


def _resolve_helius_url() -> str | None:
    if settings.helius_rpc_url:
        return settings.helius_rpc_url
    if settings.helius_api_key:
        base_url = settings.helius_base_url.rstrip("/")
        return f"{base_url}/?api-key={settings.helius_api_key}"
    return None


def _parse_solana_transfer_timestamp(tx: dict) -> datetime:
    ts = tx.get("timestamp") or tx.get("blockTime")
    if ts:
        try:
            return datetime.fromtimestamp(int(ts), tz=UTC)
        except (TypeError, ValueError):
            pass
    return datetime.now(UTC)


def _normalize_solana_native_transfer(
    tx_id: str,
    address: str,
    amount_lamports: Decimal,
    timestamp: datetime,
    counterparty: str | None,
    direction: str,
    raw: dict,
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
    raw: dict,
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


def _parse_solana_enriched(tx: dict, address: str) -> list[NormalizedTransaction]:
    transfers: list[NormalizedTransaction] = []
    tx_id = str(tx.get("signature") or tx.get("transaction") or "")
    timestamp = _parse_solana_transfer_timestamp(tx)

    native_transfers = tx.get("nativeTransfers") or []
    for idx, transfer in enumerate(native_transfers):
        from_addr = transfer.get("fromUserAccount")
        to_addr = transfer.get("toUserAccount")
        if address not in {from_addr, to_addr}:
            continue
        direction = "outflow" if from_addr == address else "inflow"
        counterparty = to_addr if direction == "outflow" else from_addr
        amount = Decimal(str(transfer.get("amount") or 0))
        transfers.append(
            _normalize_solana_native_transfer(
                tx_id,
                address,
                amount,
                timestamp,
                counterparty,
                direction,
                transfer,
                str(idx),
            )
        )

    token_transfers = tx.get("tokenTransfers") or []
    for idx, transfer in enumerate(token_transfers):
        from_addr = transfer.get("fromUserAccount")
        to_addr = transfer.get("toUserAccount")
        if address not in {from_addr, to_addr}:
            continue
        direction = "outflow" if from_addr == address else "inflow"
        counterparty = to_addr if direction == "outflow" else from_addr
        mint = transfer.get("mint") or ""
        token_amount = transfer.get("tokenAmount") or {}
        raw_amount = Decimal(str(token_amount.get("amount") or 0))
        decimals = int(token_amount.get("decimals") or 0)
        transfers.append(
            _normalize_solana_token_transfer(
                tx_id,
                address,
                mint,
                raw_amount,
                decimals,
                timestamp,
                counterparty,
                direction,
                transfer,
                str(idx),
            )
        )

    if transfers:
        return transfers

    if "transaction" in tx and "meta" in tx:
        return _parse_solana_fallback(tx, address)

    return []


def _parse_solana_fallback(tx: dict, address: str) -> list[NormalizedTransaction]:
    meta = tx.get("meta") or {}
    message = tx.get("transaction", {}).get("message", {})
    keys = message.get("accountKeys") or []
    if keys and isinstance(keys[0], dict):
        keys = [entry.get("pubkey") for entry in keys]

    transfers: list[NormalizedTransaction] = []
    tx_id = str(tx.get("transaction", {}).get("signatures", [""])[0])
    timestamp = _parse_solana_transfer_timestamp(tx)

    if address in keys:
        idx = keys.index(address)
        pre_balances = meta.get("preBalances") or []
        post_balances = meta.get("postBalances") or []
        if idx < len(pre_balances) and idx < len(post_balances):
            diff = Decimal(post_balances[idx]) - Decimal(pre_balances[idx])
            if diff != 0:
                direction = "inflow" if diff > 0 else "outflow"
                counterparty = None
                transfers.append(
                    _normalize_solana_native_transfer(
                        tx_id,
                        address,
                        abs(diff),
                        timestamp,
                        counterparty,
                        direction,
                        tx,
                        "0",
                    )
                )

    pre_tokens = meta.get("preTokenBalances") or []
    post_tokens = meta.get("postTokenBalances") or []
    token_map: dict[str, dict] = {}
    for entry in pre_tokens:
        if entry.get("owner") != address:
            continue
        mint = entry.get("mint") or ""
        amount = Decimal(str(entry.get("uiTokenAmount", {}).get("amount") or 0))
        decimals = int(entry.get("uiTokenAmount", {}).get("decimals") or 0)
        token_map.setdefault(mint, {"decimals": decimals, "pre": Decimal(0), "post": Decimal(0)})
        token_map[mint]["pre"] = amount
        token_map[mint]["decimals"] = decimals

    for entry in post_tokens:
        if entry.get("owner") != address:
            continue
        mint = entry.get("mint") or ""
        amount = Decimal(str(entry.get("uiTokenAmount", {}).get("amount") or 0))
        decimals = int(entry.get("uiTokenAmount", {}).get("decimals") or 0)
        token_map.setdefault(mint, {"decimals": decimals, "pre": Decimal(0), "post": Decimal(0)})
        token_map[mint]["post"] = amount
        token_map[mint]["decimals"] = decimals

    for idx, (mint, values) in enumerate(token_map.items()):
        diff = values.get("post", Decimal(0)) - values.get("pre", Decimal(0))
        if diff == 0:
            continue
        direction = "inflow" if diff > 0 else "outflow"
        transfers.append(
            _normalize_solana_token_transfer(
                tx_id,
                address,
                mint,
                abs(diff),
                int(values.get("decimals") or 0),
                timestamp,
                None,
                direction,
                tx,
                str(idx),
            )
        )

    return transfers


def _fetch_solana_helius(
    helius_url: str, address: str, cursor: str | None
) -> Web3HistoryResult | None:
    cursor_data = _load_cursor(cursor)
    params = {
        "limit": SOLANA_PAGE_SIZE,
        "transactionDetails": "full",
        "sortOrder": "asc",
        "filters": {"status": "succeeded"},
    }
    if cursor_data.get("page_offset"):
        params["pageOffset"] = cursor_data["page_offset"]
    if cursor_data.get("before"):
        params["before"] = cursor_data["before"]

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransactionsForAddress",
        "params": [address, params],
    }

    time.sleep(0.2)
    try:
        data, _headers = _request_json(
            "POST", helius_url, json_body=payload, timeout=20
        )
    except ProviderOverloaded:
        logger.warning("Helius provider rate limited; skipping sync.")
        return Web3HistoryResult([], cursor, False)
    except ProviderError:
        return None

    error = data.get("error")
    if error:
        code = error.get("code")
        message = str(error.get("message") or "")
        if code == -32046 or "Cannot fulfill request" in message:
            logger.warning("Helius RPC cannot fulfill request; skipping sync.")
            return Web3HistoryResult([], cursor, False)
        return None

    result = data.get("result")
    if not isinstance(result, list):
        return None

    transactions: list[NormalizedTransaction] = []
    for tx in result:
        transactions.extend(_parse_solana_enriched(tx, address))

    page_info = data.get("pageInfo") or data.get("pagination") or {}
    next_offset = page_info.get("nextPageOffset") or page_info.get("next")
    next_before = page_info.get("before")

    if next_offset is not None:
        next_cursor = _dump_cursor({"page_offset": next_offset})
    elif next_before:
        next_cursor = _dump_cursor({"before": next_before})
    elif len(result) >= SOLANA_PAGE_SIZE:
        last_sig = result[-1].get("signature")
        next_cursor = _dump_cursor({"before": last_sig}) if last_sig else None
    else:
        next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_solana_fallback_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    before_sig = cursor_data.get("before")

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [address, {"limit": SOLANA_PAGE_SIZE}],
    }
    if before_sig:
        payload["params"][1]["before"] = before_sig

    time.sleep(0.2)
    try:
        data, _headers = _request_json(
            "POST", settings.solana_rpc_url, json_body=payload, timeout=15
        )
    except ProviderOverloaded:
        logger.warning("Solana RPC rate limited; skipping sync.")
        return Web3HistoryResult([], cursor, False)
    error = data.get("error")
    if error:
        code = error.get("code")
        message = str(error.get("message") or "")
        if code == -32046 or "Cannot fulfill request" in message:
            logger.warning("Solana RPC cannot fulfill request; skipping sync.")
            return Web3HistoryResult([], cursor, False)
        raise ProviderError(f"Solana RPC error: {message}")
    signatures = data.get("result") or []
    if not signatures:
        return Web3HistoryResult([], None, True)

    transactions: list[NormalizedTransaction] = []
    for entry in signatures:
        sig = entry.get("signature")
        if not sig:
            continue
        tx_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [sig, {"encoding": "json", "maxSupportedTransactionVersion": 0}],
        }
        try:
            time.sleep(0.1)
            tx_data, _headers = _request_json(
                "POST", settings.solana_rpc_url, json_body=tx_payload, timeout=10
            )
        except ProviderOverloaded:
            logger.warning("Solana RPC rate limited; skipping sync.")
            return Web3HistoryResult([], cursor, False)

        result = tx_data.get("result")
        if not result:
            continue
        transactions.extend(_parse_solana_fallback(result, address))

    last_signature = signatures[-1].get("signature")
    next_cursor = _dump_cursor({"before": last_signature}) if last_signature else None
    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_solana_history(address: str, cursor: str | None) -> Web3HistoryResult:
    helius_url = _resolve_helius_url()
    if helius_url:
        helius_result = _fetch_solana_helius(helius_url, address, cursor)
        if helius_result is not None:
            return helius_result
    return _fetch_solana_fallback_history(address, cursor)


def _parse_iso_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    if value.isdigit():
        return datetime.fromtimestamp(int(value), tz=UTC)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return datetime.now(UTC)


def _normalize_bitcoin(
    tx_id: str,
    address: str,
    amount_sats: Decimal,
    timestamp: datetime,
    direction: str,
    counterparty: str | None,
    raw: dict,
    suffix: str,
) -> NormalizedTransaction:
    amount_btc = amount_sats / Decimal("100000000")
    payload = {
        "tx_id": f"{tx_id}:{suffix}",
        "account_id": address,
        "amount": amount_btc,
        "currency_code": "BTC",
        "timestamp": timestamp,
        "counterparty": counterparty,
        "type": "transfer",
        "direction": direction,
        "on_chain_units": amount_sats,
        "on_chain_symbol": "BTC",
        "raw": raw,
    }
    return normalize_transaction(payload)


def _fetch_bitquery_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    offset = int(cursor_data.get("offset") or 0)

    try:
        payload = bitquery_query(
            BITCOIN_TRANSFERS_QUERY,
            variables={
                "address": address,
                "limit": int(BITQUERY_PAGE_SIZE),
                "offset": int(offset),
            },
            timeout=20,
        )
    except RuntimeError as exc:
        raise ProviderError(str(exc)) from exc

    data = payload.get("chain") or {}
    items = data.get("Transfers") or data.get("transfers") or []

    transactions: list[NormalizedTransaction] = []
    for idx, item in enumerate(items):
        transfer = item.get("Transfer") or {}
        sender = transfer.get("Sender")
        receiver = transfer.get("Receiver")
        sender_addr = (
            sender.get("Address") if isinstance(sender, dict) else sender
        )
        if isinstance(sender, dict) and sender_addr is None:
            sender_addr = sender.get("address")
        receiver_addr = (
            receiver.get("Address") if isinstance(receiver, dict) else receiver
        )
        if isinstance(receiver, dict) and receiver_addr is None:
            receiver_addr = receiver.get("address")
        direction = (
            "outflow"
            if sender_addr and str(sender_addr).lower() == address.lower()
            else "inflow"
        )
        counterparty = receiver_addr if direction == "outflow" else sender_addr

        currency = transfer.get("Currency") or {}
        symbol = currency.get("Symbol") or "BTC"
        decimals_raw = currency.get("Decimals")
        try:
            decimals = int(decimals_raw) if decimals_raw is not None else 0
        except (TypeError, ValueError):
            decimals = 0

        raw_amount = Decimal(str(transfer.get("Amount") or 0))
        divisor = Decimal(10) ** decimals if decimals else Decimal(1)
        amount = raw_amount / divisor

        tx_hash = (transfer.get("Transaction") or {}).get("Hash") or ""
        block_time = (item.get("Block") or {}).get("Time")
        timestamp = _parse_iso_timestamp(str(block_time or ""))

        payload_tx = {
            "tx_id": f"{tx_hash}:{idx}",
            "account_id": address,
            "amount": amount,
            "currency_code": symbol,
            "timestamp": timestamp,
            "counterparty": counterparty,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": str(raw_amount),
            "on_chain_symbol": symbol,
            "raw": item,
        }
        transactions.append(normalize_transaction(payload_tx))

    if len(items) >= BITQUERY_PAGE_SIZE:
        next_cursor = _dump_cursor({"offset": offset + BITQUERY_PAGE_SIZE})
    else:
        next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_blockchain_com_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    offset = int(cursor_data.get("offset") or 0)

    params = {"active": address, "limit": BLOCKCHAIN_COM_PAGE_SIZE, "offset": offset}
    payload, _headers = _request_json(
        "GET", f"{settings.blockchain_com_url}/multiaddr", params=params, timeout=20
    )

    txs = payload.get("txs") or []
    transactions: list[NormalizedTransaction] = []
    for tx in txs:
        total_in = sum(
            int(inp.get("prev_out", {}).get("value") or 0)
            for inp in tx.get("inputs", [])
            if inp.get("prev_out", {}).get("addr") == address
        )
        total_out = sum(
            int(out.get("value") or 0)
            for out in tx.get("out", [])
            if out.get("addr") == address
        )
        net = total_out - total_in
        if net == 0:
            continue
        direction = "inflow" if net > 0 else "outflow"
        timestamp = datetime.fromtimestamp(int(tx.get("time") or 0), tz=UTC)
        transactions.append(
            _normalize_bitcoin(
                tx.get("hash") or "",
                address,
                Decimal(abs(net)),
                timestamp,
                direction,
                None,
                tx,
                "net",
            )
        )

    if len(txs) >= BLOCKCHAIN_COM_PAGE_SIZE:
        next_cursor = _dump_cursor({"offset": offset + BLOCKCHAIN_COM_PAGE_SIZE})
    else:
        next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_bitcoin_history(address: str, cursor: str | None) -> Web3HistoryResult:
    if settings.bitquery_api_key:
        try:
            return _fetch_bitquery_history(address, cursor)
        except ProviderOverloaded:
            logger.warning("Bitquery rate limited; skipping sync.")
            return Web3HistoryResult([], cursor, False)
        except ProviderError as exc:
            logger.warning("Bitquery error; falling back to blockchain.com: %s", exc)
    return _fetch_blockchain_com_history(address, cursor)


def _normalize_xrp_amount(amount: str | dict) -> tuple[Decimal, str, Decimal | None]:
    if isinstance(amount, dict):
        value = Decimal(str(amount.get("value") or "0"))
        currency = str(amount.get("currency") or "")
        return value, currency, None
    drops = Decimal(str(amount or "0"))
    return drops / Decimal("1000000"), "XRP", drops


def _fetch_xrp_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)
    marker = cursor_data.get("marker")
    start = int(cursor_data.get("start") or 0)

    params = {"type": "Payment", "result": "success", "limit": XRPSCAN_PAGE_SIZE}
    if marker:
        params["marker"] = marker
    else:
        params["start"] = start

    payload, _headers = _request_json(
        "GET",
        f"{settings.xrpscan_url}/account/{address}/transactions",
        params=params,
        timeout=20,
    )

    txs = payload.get("transactions") if isinstance(payload, dict) else payload
    txs = txs or []
    transactions: list[NormalizedTransaction] = []

    for idx, tx in enumerate(txs):
        tx_hash = tx.get("hash") or ""
        amount_value, currency, on_chain_units = _normalize_xrp_amount(tx.get("amount"))
        account = tx.get("account")
        destination = tx.get("destination")
        direction = "outflow" if account == address else "inflow"
        counterparty = destination if direction == "outflow" else account
        timestamp = _parse_iso_timestamp(str(tx.get("date") or ""))

        payload_tx = {
            "tx_id": f"{tx_hash}:{idx}",
            "account_id": address,
            "amount": amount_value,
            "currency_code": currency or "XRP",
            "timestamp": timestamp,
            "counterparty": counterparty,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": on_chain_units,
            "on_chain_symbol": "XRP" if currency == "XRP" else currency,
            "raw": tx,
        }
        transactions.append(normalize_transaction(payload_tx))

    next_marker = payload.get("marker") if isinstance(payload, dict) else None
    if next_marker:
        next_cursor = _dump_cursor({"marker": next_marker})
    elif len(txs) >= XRPSCAN_PAGE_SIZE:
        next_cursor = _dump_cursor({"start": start + XRPSCAN_PAGE_SIZE})
    else:
        next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_cardano_history(address: str, cursor: str | None) -> Web3HistoryResult:
    if not settings.blockfrost_api_key:
        logger.info("Blockfrost disabled (missing API key).")
        return Web3HistoryResult([], cursor, False)

    cursor_data = _load_cursor(cursor)
    page = int(cursor_data.get("page") or 1)

    params = {"order": "asc", "count": BLOCKFROST_PAGE_SIZE, "page": page}
    headers = {"project_id": settings.blockfrost_api_key}

    txs, _headers = _request_json(
        "GET",
        f"{settings.blockfrost_url_mainnet}/addresses/{address}/transactions",
        params=params,
        headers=headers,
        timeout=20,
    )

    transactions: list[NormalizedTransaction] = []
    for idx, entry in enumerate(txs or []):
        tx_hash = entry.get("tx_hash")
        if not tx_hash:
            continue
        tx_detail, _headers = _request_json(
            "GET",
            f"{settings.blockfrost_url_mainnet}/txs/{tx_hash}",
            headers=headers,
            timeout=20,
        )
        utxos, _headers = _request_json(
            "GET",
            f"{settings.blockfrost_url_mainnet}/txs/{tx_hash}/utxos",
            headers=headers,
            timeout=20,
        )
        inputs = utxos.get("inputs") or []
        outputs = utxos.get("outputs") or []

        def _sum_lovelace(items: list[dict]) -> int:
            total = 0
            for item in items:
                if item.get("address") != address:
                    continue
                for amt in item.get("amount", []):
                    if amt.get("unit") == "lovelace":
                        total += int(amt.get("quantity") or 0)
            return total

        in_amount = _sum_lovelace(inputs)
        out_amount = _sum_lovelace(outputs)
        net = out_amount - in_amount
        if net == 0:
            continue
        direction = "inflow" if net > 0 else "outflow"
        timestamp = datetime.fromtimestamp(int(tx_detail.get("block_time") or 0), tz=UTC)

        payload_tx = {
            "tx_id": f"{tx_hash}:{idx}",
            "account_id": address,
            "amount": Decimal(abs(net)) / Decimal("1000000"),
            "currency_code": "ADA",
            "timestamp": timestamp,
            "counterparty": None,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": Decimal(abs(net)),
            "on_chain_symbol": "ADA",
            "raw": {"tx": tx_detail, "utxos": utxos},
        }
        transactions.append(normalize_transaction(payload_tx))

    if len(txs or []) >= BLOCKFROST_PAGE_SIZE:
        next_cursor = _dump_cursor({"page": page + 1})
    else:
        next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


def _fetch_tron_history(address: str, cursor: str | None) -> Web3HistoryResult:
    cursor_data = _load_cursor(cursor)

    if settings.trongrid_api_key:
        fingerprint = cursor_data.get("fingerprint")
        params = {"limit": TRONGRID_PAGE_SIZE}
        if fingerprint:
            params["fingerprint"] = fingerprint
        headers = {"TRON-PRO-API-KEY": settings.trongrid_api_key}
        payload, _headers = _request_json(
            "GET",
            f"{settings.trongrid_url}/accounts/{address}/transactions",
            params=params,
            headers=headers,
            timeout=20,
        )
        txs = payload.get("data") or []
        next_fingerprint = payload.get("meta", {}).get("fingerprint")
    else:
        offset = int(cursor_data.get("start") or 0)
        params = {
            "sort": "-timestamp",
            "limit": TRONSCAN_PAGE_SIZE,
            "start": offset,
            "relatedAddress": address,
        }
        payload, _headers = _request_json(
            "GET", f"{settings.tronscan_base_url}/api/transaction", params=params, timeout=20
        )
        txs = payload.get("data") or []
        next_fingerprint = None

    transactions: list[NormalizedTransaction] = []
    for idx, tx in enumerate(txs):
        raw_contract = tx.get("raw_data", {}).get("contract", [])
        if raw_contract:
            raw_contract = raw_contract[0]
        val = raw_contract.get("parameter", {}).get("value", {}) if raw_contract else {}

        amount_sun = Decimal(str(val.get("amount") or tx.get("amount") or 0))
        amount = amount_sun / Decimal("1000000")

        owner = val.get("owner_address") or tx.get("ownerAddress")
        to_addr = val.get("to_address") or tx.get("toAddress")
        direction = "outflow" if owner == address else "inflow"
        counterparty = to_addr if direction == "outflow" else owner

        token_info = tx.get("tokenInfo") or {}
        token_contract = token_info.get("tokenId") or token_info.get("tokenAddress")
        token_decimals = int(token_info.get("tokenDecimal") or 0)
        if token_contract:
            raw_value = Decimal(str(tx.get("amount") or amount_sun))
            divisor = Decimal(10) ** token_decimals if token_decimals else Decimal(1)
            amount = raw_value / divisor
            currency_code = token_contract
            on_chain_symbol = token_info.get("tokenAbbr") or token_contract
            on_chain_units = raw_value
        else:
            currency_code = "TRX"
            on_chain_symbol = "TRX"
            on_chain_units = amount_sun

        timestamp_ms = tx.get("block_timestamp") or tx.get("timestamp") or 0
        payload_tx = {
            "tx_id": f"{tx.get('hash') or tx.get('txID') or ''}:{idx}",
            "account_id": address,
            "amount": amount,
            "currency_code": currency_code,
            "timestamp": datetime.fromtimestamp(int(timestamp_ms) / 1000, tz=UTC),
            "counterparty": counterparty,
            "type": "transfer",
            "direction": direction,
            "on_chain_units": on_chain_units,
            "on_chain_symbol": on_chain_symbol,
            "raw": tx,
        }
        transactions.append(normalize_transaction(payload_tx))

    if settings.trongrid_api_key:
        next_cursor = (
            _dump_cursor({"fingerprint": next_fingerprint})
            if next_fingerprint
            else None
        )
    else:
        if len(txs) >= TRONSCAN_PAGE_SIZE:
            next_cursor = _dump_cursor({"start": offset + TRONSCAN_PAGE_SIZE})
        else:
            next_cursor = None

    return Web3HistoryResult(transactions, next_cursor, True)


__all__ = ["Web3HistoryResult", "fetch_web3_history", "ProviderOverloaded", "ProviderError"]
