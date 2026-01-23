# Updated 2025-12-11 02:55 CST by ChatGPT
"""
Connector abstraction and normalization for CEX/Web3 data sources.

Responsibilities:
- Switch implementations based on APP_ENV (local/sandbox -> mocks; production -> real clients).
- Normalize payloads to a shared fiat-friendly transaction schema.
- Keep external dependencies (ccxt/web3) optional and loaded lazily to avoid breaking local dev.
"""

from __future__ import annotations

import importlib
import logging
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, Protocol

from backend.core import settings

TransactionType = Literal["deposit", "withdrawal", "transfer", "trade"]
Direction = Literal["inflow", "outflow"]
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NormalizedTransaction:
    """Unified transaction record for downstream storage and UX."""

    amount: Decimal
    currency_code: str
    timestamp: datetime
    merchant_name: str | None
    counterparty: str | None
    tx_id: str
    account_id: str
    type: TransactionType
    direction: Direction
    on_chain_units: Decimal | None = None
    on_chain_symbol: str | None = None
    fiat_display: str | None = None
    raw: dict | None = None


class ConnectorClient(Protocol):
    """Minimal connector contract to fetch normalized transactions."""

    def fetch_transactions(
        self, account_id: str
    ) -> Iterable[NormalizedTransaction]: ...


def _resolve_env(
    app_env: str | None = None,
) -> Literal["local", "sandbox", "production"]:
    env = (app_env or settings.app_env).lower()
    if env in {"prod", "production"}:
        return "production"
    if env in {"sandbox", "development", "dev"}:
        return "sandbox"
    return "local"


def _ensure_timezone(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts.replace(tzinfo=UTC)
    return ts.astimezone(UTC)


def normalize_transaction(
    payload: dict,
    *,
    converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
) -> NormalizedTransaction:
    """
    Convert arbitrary connector payload to the fiat transaction schema.

    Required keys: amount, currency_code (or currency), timestamp, tx_id, account_id,
    type, direction. Optional: merchant_name, counterparty, on_chain_units, on_chain_symbol.
    """
    if "amount" not in payload:
        raise ValueError("payload.amount is required for normalization")
    raw_amount = payload["amount"]
    amount = raw_amount if isinstance(raw_amount, Decimal) else Decimal(str(raw_amount))

    currency_code = payload.get("currency_code") or payload.get("currency") or "USD"
    currency_code = _normalize_currency_code(currency_code)

    ts_raw = payload.get("timestamp") or payload.get("ts")
    if ts_raw is None:
        raise ValueError("payload.timestamp is required for normalization")
    if isinstance(ts_raw, str):
        ts_raw = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
    timestamp = _ensure_timezone(ts_raw)

    on_chain_units = payload.get("on_chain_units")
    if on_chain_units is not None and not isinstance(on_chain_units, Decimal):
        on_chain_units = Decimal(str(on_chain_units))

    record = NormalizedTransaction(
        amount=amount,
        currency_code=currency_code,
        timestamp=timestamp,
        merchant_name=payload.get("merchant_name"),
        counterparty=payload.get("counterparty"),
        tx_id=str(
            payload.get("tx_id") or payload.get("transaction_id") or payload.get("hash")
        ),
        account_id=str(payload.get("account_id") or payload.get("wallet") or "unknown"),
        type=payload.get("type", "deposit"),
        direction=payload.get("direction", "inflow"),
        on_chain_units=on_chain_units,
        on_chain_symbol=payload.get("on_chain_symbol"),
        raw=payload,
    )

    if converter:
        fiat_amount, fiat_code = converter(amount, record.currency_code)
        record = NormalizedTransaction(
            **{**record.__dict__, "fiat_display": f"{fiat_amount} {fiat_code}"},
        )
    return record


def _normalize_currency_code(value: str) -> str:
    text = str(value)
    if text.startswith("0x") and len(text) == 42:
        return text
    if len(text) >= 32 and any(ch.isdigit() for ch in text):
        return text
    return text.upper()





class CcxtConnectorClient:
    """
    Thin wrapper around ccxt to fetch CEX transactions.

    The client is intentionally read-only. API keys are optional; if missing,
    only public endpoints can be used.
    """

    def __init__(
        self,
        exchange_id: str,
        api_key: str | None = None,
        api_secret: str | None = None,
        converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    ) -> None:
        self.exchange_id = exchange_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.converter = converter

    def _load_exchange(self):
        ccxt = importlib.import_module("ccxt")
        if not hasattr(ccxt, self.exchange_id):
            raise RuntimeError(f"The crypto exchange '{self.exchange_id}' is not currently supported.")
        klass = getattr(ccxt, self.exchange_id)
        
        # For Coinbase Advanced, ensure secret has proper newlines
        secret = self.api_secret
        if self.exchange_id == "coinbaseadvanced" and secret:
            # Ensure newlines are actual newlines, not escape sequences
            if "\\n" in secret and "\n" not in secret.replace("\\n", ""):
                secret = secret.replace("\\n", "\n")
        
        exchange = klass(
            {
                "apiKey": self.api_key,
                "secret": secret,
                "enableRateLimit": True,
            }
        )
        return exchange

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        try:
            exchange = self._load_exchange()
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "ccxt is required for production CEX connectors. Install with `pip install ccxt`."
            ) from exc

        if not self.api_key or not self.api_secret:
            raise RuntimeError(
                "API credentials are required to fetch your private transaction history from this exchange."
            )

        try:
            # First try to load markets to validate basic connectivity
            exchange.load_markets()
            # Then try to fetch trades (requires authentication)
            trades = exchange.fetch_my_trades(limit=50)
        except Exception as exc:
            # If fetch_my_trades fails, check if it's an authentication error
            error_msg = str(exc).lower()
            if "authentication" in error_msg or "unauthorized" in error_msg or "401" in error_msg:
                raise RuntimeError(
                    f"Failed to authenticate with {self.exchange_id}. Please verify your API credentials are correct. Error: {str(exc)}"
                ) from exc
            # For other errors, if markets loaded successfully, credentials are valid
            # but there might be no trades or another issue
            try:
                exchange.load_markets()
                # If we get here, credentials are valid but might not have trades
                trades = []
            except Exception as auth_exc:
                raise RuntimeError(
                    f"Failed to authenticate with {self.exchange_id}. Please verify your API credentials are correct. Error: {str(auth_exc)}"
                ) from auth_exc

        payloads = []
        for trade in trades:
            # Parse currency code from symbol (e.g., "BTC/USD" -> "USD")
            symbol = trade.get("symbol", "")
            currency_code = "USD"  # Default fallback
            if symbol and "/" in symbol:
                symbol_parts = symbol.split("/")
                if len(symbol_parts) > 1:
                    currency_code = symbol_parts[1]
            
            # Safely handle timestamp - might be in different formats
            timestamp = trade.get("timestamp")
            if timestamp:
                try:
                    # Handle both milliseconds and seconds timestamps
                    if timestamp > 1e10:  # Likely milliseconds
                        trade_timestamp = datetime.fromtimestamp(timestamp / 1000.0, tz=UTC)
                    else:  # Likely seconds
                        trade_timestamp = datetime.fromtimestamp(timestamp, tz=UTC)
                except (ValueError, OSError, TypeError):
                    # Fallback to current time if timestamp is invalid
                    trade_timestamp = datetime.now(UTC)
            else:
                trade_timestamp = datetime.now(UTC)
            
            payloads.append(
                {
                    "tx_id": trade.get("id") or f"trade_{len(payloads)}",
                    "account_id": account_id,
                    "amount": trade.get("cost") or trade.get("amount") or 0,
                    "currency_code": currency_code,
                    "timestamp": trade_timestamp,
                    "counterparty": trade.get("side"),
                    "type": "trade",
                    "direction": "inflow" if trade.get("side") == "buy" else "outflow",
                    "raw": trade,
                }
            )

        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class EVMConnector:
    """
    Read-only Web3 connector using JSON-RPC for EVM chains (Ethereum, Polygon, BSC).
    """

    def __init__(
        self,
        rpc_url: str,
        symbol: str = "ETH",
        converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    ) -> None:
        self.rpc_url = rpc_url
        self.symbol = symbol
        self.converter = converter

    def _load_web3(self):
        web3 = importlib.import_module("web3")
        return web3.Web3(
            web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 10})
        )

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        try:
            w3 = self._load_web3()
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "web3 is required for EVM connectors. Install with `pip install web3`."
            ) from exc

        if not w3.is_connected():
            raise RuntimeError("Unable to connect to EVM RPC.")

        try:
            latest_block = w3.eth.block_number
        except Exception as exc:
            # Public RPCs can return -32046 when overloaded; fail softly.
            payload = exc.args[0] if exc.args else {}
            if isinstance(payload, dict):
                message = str(payload.get("message", ""))
                code = payload.get("code")
            else:
                message = str(payload)
                code = None
            if code == -32046 or "Cannot fulfill request" in message:
                logger.warning("EVM RPC cannot fulfill request; skipping sync.")
                return []
            raise
        payloads = []
        account_id_lower = account_id.lower()
        # Scan last 10 blocks for demo purposes. Real indexing requires a dedicated indexer.
        for block_number in range(latest_block - 10, latest_block + 1):
            block = w3.eth.get_block(block_number, full_transactions=True)
            for tx in block.transactions:
                tx_from = str(tx.get("from", "")).lower()
                tx_to = str(tx.get("to", "")).lower()
                if tx_from == account_id_lower or tx_to == account_id_lower:
                    direction: Direction = (
                        "outflow" if tx_from == account_id_lower else "inflow"
                    )
                    payloads.append(
                        {
                            "tx_id": tx["hash"].hex(),
                            "account_id": account_id,
                            "amount": w3.from_wei(tx["value"], "ether"),
                            "currency_code": self.symbol,
                            "timestamp": datetime.fromtimestamp(
                                block.timestamp, tz=UTC
                            ),
                            "counterparty": tx.get("to")
                            if direction == "outflow"
                            else tx.get("from"),
                            "type": "transfer",
                            "direction": direction,
                            "on_chain_units": tx["value"],
                            "on_chain_symbol": self.symbol,
                            "raw": dict(tx),
                        }
                    )

        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class BitcoinConnector:
    """Read-only Bitcoin connector using Blockstream/Mempool.space API."""
    
    def __init__(self, converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None):
        self.api_base = settings.bitcoin_api_url
        self.converter = converter

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        requests = importlib.import_module("requests")
        resp = requests.get(f"{self.api_base}/address/{account_id}/txs")
        if not resp.ok:
            return []
            
        payloads = []
        txs = resp.json()
        for tx in txs:
            # Simple heuristic: sum inputs/outputs to determine flow
            total_in = sum(i["value"] for i in tx["vin"] if i.get("prevout", {}).get("scriptpubkey_address") == account_id)
            total_out = sum(o["value"] for o in tx["vout"] if o.get("scriptpubkey_address") == account_id)
            
            amount_sats = total_out - total_in
            amount_btc = Decimal(abs(amount_sats)) / Decimal("100000000")
            direction = "inflow" if amount_sats > 0 else "outflow"
            
            payloads.append({
                "tx_id": tx["txid"],
                "account_id": account_id,
                "amount": amount_btc,
                "currency_code": "BTC",
                "timestamp": datetime.fromtimestamp(tx["status"]["block_time"], tz=UTC) if tx["status"]["confirmed"] else datetime.now(UTC),
                "type": "transfer",
                "direction": direction,
                "raw": tx
            })
            
        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class SolanaConnector:
    """Read-only Solana connector using JSON-RPC."""
    
    def __init__(self, converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None):
        self.rpc_url = settings.solana_rpc_url
        self.converter = converter

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        import time
        requests = importlib.import_module("requests")

        if not self.rpc_url:
            raise RuntimeError("SOLANA_RPC_URL is not configured.")

        # 1. Get Signatures
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSignaturesForAddress",
            "params": [account_id, {"limit": 10}],
        }
        sigs: list[str] = []
        last_error: Exception | None = None
        soft_failure = False
        for attempt in range(3):
            try:
                resp = requests.post(self.rpc_url, json=payload, timeout=6)
                if resp.status_code == 429:
                    last_error = RuntimeError(
                        "Solana network is busy (429). Please try again later."
                    )
                    time.sleep(0.5 * (attempt + 1))
                    continue
                if not resp.ok:
                    last_error = RuntimeError(
                        f"Solana RPC error: {resp.status_code} {resp.text}"
                    )
                    time.sleep(0.25 * (attempt + 1))
                    continue

                data = resp.json()
                if "error" in data:
                    err = data.get("error") or {}
                    err_message = err.get("message") or str(err)
                    err_code = err.get("code")
                    if err_code == -32046 or "Cannot fulfill request" in str(err_message):
                        soft_failure = True
                    last_error = RuntimeError(f"Solana RPC error: {err_message}")
                    time.sleep(0.25 * (attempt + 1))
                    continue

                sigs = [item["signature"] for item in data.get("result", [])]
                last_error = None
                break
            except Exception as e:
                last_error = e
                time.sleep(0.25 * (attempt + 1))
        if last_error:
            if soft_failure:
                logger.warning("Solana RPC cannot fulfill request; skipping sync.")
                return []
            raise RuntimeError(f"Failed to fetch Solana signatures: {last_error}") from last_error

        if not sigs:
            return []

        # 2. Get Transaction Details (simplistic matching)
        payloads = []
        start_time = time.monotonic()
        time_budget = 20.0
        for sig in sigs:
            try:
                if time.monotonic() - start_time > time_budget:
                    break
                tx_payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [sig, {"encoding": "json", "maxSupportedTransactionVersion": 0}]
                }
                time.sleep(0.2) # Rate limit protection
                tx_resp = requests.post(self.rpc_url, json=tx_payload, timeout=4)
                if tx_resp.status_code == 429:
                    time.sleep(0.4)
                    continue
                if not tx_resp.ok:
                    continue # Skip individual failed tx lookups
                    
                tx_data = tx_resp.json()
                result = tx_data.get("result")
                
                if not result:
                    continue

                # Calculate real amount change
                amount_sol = self._parse_solana_amount(result, account_id)

                payloads.append({
                    "tx_id": sig,
                    "account_id": account_id,
                    "amount": amount_sol,
                    "currency_code": "SOL",
                    "timestamp": datetime.fromtimestamp(result["blockTime"], tz=UTC) if result.get("blockTime") else datetime.now(UTC),
                    "type": "transfer", # Simplified
                    "direction": "outflow", # Default assumption
                    "raw": result
                })
            except Exception:
                continue # Skip bad txs
            
        return [normalize_transaction(p, converter=self.converter) for p in payloads]

    def _parse_solana_amount(self, result: dict, account_id: str) -> Decimal:
        """Calculate amount from pre/post token balance differences."""
        try:
            meta = result.get("meta")
            if not meta:
                return Decimal("0")
                
            # Account keys are in transaction.message.accountKeys
            # In newer versions, it might be nested differently or statically keyed
            msg = result.get("transaction", {}).get("message", {})
            keys = msg.get("accountKeys", [])
            
            # Simple case: keys is a list of strings
            if keys and isinstance(keys[0], dict):
                # Versioned tx structure sometimes has {'pubkey': '...', 'signer': ...}
                keys = [k.get("pubkey") for k in keys]
            
            try:
                idx = keys.index(account_id)
            except ValueError:
                return Decimal("0")
                
            pre = meta["preBalances"][idx]
            post = meta["postBalances"][idx]
            
            # Amount changed in lamports (1e9)
            diff = post - pre
            return Decimal(abs(diff)) / Decimal("1000000000")
        except Exception:
            return Decimal("0")



class RippleConnector:
    """Read-only XRP Ledger connector."""
    
    def __init__(self, converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None):
        self.rpc_url = settings.ripple_rpc_url
        self.converter = converter

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        requests = importlib.import_module("requests")
        payload = {
            "method": "account_tx",
            "params": [{
                "account": account_id,
                "limit": 10
            }]
        }
        resp = requests.post(self.rpc_url, json=payload, timeout=10)
        data = resp.json()
        
        txs = data.get("result", {}).get("transactions", [])
        payloads = []
        
        for item in txs:
            tx = item["tx"]
            meta = item["meta"]
            
            # Drops to XRP
            # Check logic for delivered_amount if available
            amount_drops = tx.get("Amount", "0")
            if isinstance(amount_drops, dict):
                 # Issued currency, skip for now or handle later
                 continue
                 
            amount = Decimal(amount_drops) / Decimal("1000000")
            direction = "outflow" if tx["Account"] == account_id else "inflow"
            
            payloads.append({
                "tx_id": tx["hash"],
                "account_id": account_id,
                "amount": amount,
                "currency_code": "XRP",
                "timestamp": datetime(2000, 1, 1, tzinfo=UTC) + importlib.import_module("datetime").timedelta(seconds=tx["date"]), # Ripple Epoch
                "type": "transfer",
                "direction": direction,
                "raw": tx
            })
            
        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class CardanoConnector:
    """Read-only Cardano connector using Koios API."""
    
    def __init__(self, converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None):
        self.api_url = settings.cardano_api_url
        self.converter = converter

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        requests = importlib.import_module("requests")
        resp = requests.post(
            f"{self.api_url}/address_txs",
            json={"_addresses": [account_id]},
            headers={"details": "true"}
        )
        if not resp.ok:
            return []
            
        txs = resp.json()
        payloads = []
        
        for tx in txs:
            # Need tx_info for amounts, usually requires another call or enable details
            # If basic call returns list of hashes, we'd iterate. Koios address_txs returns minimal info.
            # For this MVF, we'll index the existence.
             payloads.append({
                "tx_id": tx["tx_hash"],
                "account_id": account_id,
                "amount": Decimal("0"), 
                "currency_code": "ADA",
                "timestamp": datetime.fromtimestamp(tx["block_time"], tz=UTC),
                "type": "transfer",
                "direction": "inflow", # Unknown without input/output analysis
                "raw": tx
            })

        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class TronConnector:
    """Read-only Tron connector using TronGrid."""
    
    def __init__(self, converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None):
        self.api_url = settings.tron_api_url
        self.converter = converter
        
    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        requests = importlib.import_module("requests")
        resp = requests.get(f"{self.api_url}/v1/accounts/{account_id}/transactions")
        if not resp.ok:
            return []
            
        data = resp.json()
        txs = data.get("data", [])
        payloads = []
        
        for tx in txs:
            # Parse contract data
            raw_contract = tx["raw_data"]["contract"][0]
            val = raw_contract["parameter"]["value"]
            amount_sun = val.get("amount", 0)
            amount = Decimal(amount_sun) / Decimal("1000000")
            
            owner = val.get("owner_address") # Hex format needs decode if raw
            # TronGrid returns easily readable addresses usually in API responses or we compare
            
            payloads.append({
                "tx_id": tx["txID"],
                "account_id": account_id,
                "amount": amount,
                "currency_code": "TRX",
                "timestamp": datetime.fromtimestamp(tx["block_timestamp"] / 1000, tz=UTC),
                "type": "transfer",
                "direction": "outflow", # Simplified
                "raw": tx
            })
            
        return [normalize_transaction(p, converter=self.converter) for p in payloads]


def build_connector(
    kind: Literal["cex", "web3"],
    *,
    app_env: str | None = None,
    converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    exchange_id: str = "binanceus",
    rpc_url: str | None = None,
    symbol: str = "ETH",
    provider: str | None = None, # New param
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ConnectorClient:
    """
    Factory returning the correct connector for the current environment.
    """
    # Logic to force mock connectors has been removed to ensure real data usage.

    if kind == "cex":
        return CcxtConnectorClient(
            exchange_id=exchange_id,
            api_key=api_key,
            api_secret=api_secret,
            converter=converter,
        )

    # Web3 Routing
    if provider == "bitcoin":
        return BitcoinConnector(converter=converter)
    if provider == "solana":
        return SolanaConnector(converter=converter)
    if provider == "ripple" or provider == "xrp":
        return RippleConnector(converter=converter)
    if provider == "cardano":
        return CardanoConnector(converter=converter)
    if provider == "tron":
        return TronConnector(converter=converter)

    # Default to EVM
    if rpc_url is None:
        rpc_url = "https://cloudflare-eth.com"

    return EVMConnector(rpc_url=rpc_url, symbol=symbol, converter=converter)


__all__ = [
    "NormalizedTransaction",
    "ConnectorClient",
    "CcxtConnectorClient",
    "EVMConnector",
    "BitcoinConnector",
    "SolanaConnector",
    "RippleConnector",
    "CardanoConnector",
    "TronConnector",
    "normalize_transaction",
    "build_connector",
]
