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
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, Protocol

from backend.core import settings

TransactionType = Literal["deposit", "withdrawal", "transfer", "trade"]
Direction = Literal["inflow", "outflow"]


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
        currency_code=str(currency_code).upper(),
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


class MockConnectorClient:
    """Deterministic mock connector for local and sandbox usage."""

    def __init__(
        self,
        kind: Literal["cex", "web3"],
        converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    ) -> None:
        self.kind = kind
        self.converter = converter

    def fetch_transactions(self, account_id: str) -> Iterable[NormalizedTransaction]:
        base_payloads = [
            {
                "tx_id": f"{self.kind}-txn-001",
                "account_id": account_id,
                "amount": "125.50",
                "currency_code": "USD",
                "timestamp": "2024-01-15T12:00:00Z",
                "merchant_name": "MockMart",
                "counterparty": "MockPay",
                "type": "deposit",
                "direction": "inflow",
            },
            {
                "tx_id": f"{self.kind}-txn-002",
                "account_id": account_id,
                "amount": "42.00",
                "currency_code": "USD",
                "timestamp": "2024-01-16T15:30:00Z",
                "merchant_name": "UtilityCo",
                "counterparty": "MockPay",
                "type": "withdrawal",
                "direction": "outflow",
            },
        ]

        if self.kind == "web3":
            base_payloads.append(
                {
                    "tx_id": f"{self.kind}-hash-003",
                    "account_id": account_id,
                    "amount": "0.0021",
                    "currency_code": "ETH",
                    "timestamp": "2024-01-17T18:45:00Z",
                    "counterparty": "0xfeedface",
                    "type": "transfer",
                    "direction": "outflow",
                    "on_chain_units": "0.0021",
                    "on_chain_symbol": "ETH",
                }
            )

        return [
            normalize_transaction(p, converter=self.converter) for p in base_payloads
        ]


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
            raise RuntimeError(f"ccxt exchange '{self.exchange_id}' not found.")
        klass = getattr(ccxt, self.exchange_id)
        exchange = klass(
            {
                "apiKey": self.api_key,
                "secret": self.api_secret,
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
                "CEX connector requires API credentials for private transaction history."
            )

        trades = exchange.fetch_my_trades(limit=50)
        payloads = []
        for trade in trades:
            payloads.append(
                {
                    "tx_id": trade.get("id"),
                    "account_id": account_id,
                    "amount": trade.get("cost") or trade.get("amount"),
                    "currency_code": trade.get("symbol", "USD").split("/")[1]
                    if trade.get("symbol")
                    else "USD",
                    "timestamp": datetime.fromtimestamp(
                        trade["timestamp"] / 1000.0, tz=UTC
                    ),
                    "counterparty": trade.get("side"),
                    "type": "trade",
                    "direction": "inflow" if trade.get("side") == "buy" else "outflow",
                    "raw": trade,
                }
            )

        return [normalize_transaction(p, converter=self.converter) for p in payloads]


class Web3RpcConnectorClient:
    """
    Read-only Web3 connector using JSON-RPC.

    Uses web3.py internally to avoid write capabilities. Only public RPC endpoints
    should be provided (e.g., Infura/Alchemy HTTPS URLs).
    """

    def __init__(
        self,
        rpc_url: str,
        converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    ) -> None:
        self.rpc_url = rpc_url
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
                "web3 is required for production Web3 connectors. Install with `pip install web3`."
            ) from exc

        if not w3.is_connected():
            raise RuntimeError("Web3 RPC provider is unreachable.")

        latest_block = w3.eth.block_number
        payloads = []
        for block_number in range(latest_block - 5, latest_block + 1):
            block = w3.eth.get_block(block_number, full_transactions=True)
            for tx in block.transactions:
                if tx["from"] == account_id or tx["to"] == account_id:
                    direction: Direction = (
                        "outflow" if tx["from"] == account_id else "inflow"
                    )
                    payloads.append(
                        {
                            "tx_id": tx["hash"].hex(),
                            "account_id": account_id,
                            "amount": w3.from_wei(tx["value"], "ether"),
                            "currency_code": "ETH",
                            "timestamp": datetime.fromtimestamp(
                                block.timestamp, tz=UTC
                            ),
                            "counterparty": tx["to"]
                            if direction == "outflow"
                            else tx["from"],
                            "type": "transfer",
                            "direction": direction,
                            "on_chain_units": tx["value"],
                            "on_chain_symbol": "ETH",
                            "raw": dict(tx),
                        }
                    )

        return [normalize_transaction(p, converter=self.converter) for p in payloads]


def build_connector(
    kind: Literal["cex", "web3"],
    *,
    app_env: str | None = None,
    converter: Callable[[Decimal, str], tuple[Decimal, str]] | None = None,
    exchange_id: str = "binanceus",
    rpc_url: str | None = None,
    api_key: str | None = None,
    api_secret: str | None = None,
) -> ConnectorClient:
    """
    Factory returning the correct connector for the current environment.

    - local/sandbox: deterministic mocks for rapid iteration.
    - production: ccxt (CEX) and web3 (RPC) with read-only semantics.
    """
    env = _resolve_env(app_env)
    if env in {"local", "sandbox"}:
        return MockConnectorClient(kind, converter=converter)

    if kind == "cex":
        return CcxtConnectorClient(
            exchange_id=exchange_id,
            api_key=api_key,
            api_secret=api_secret,
            converter=converter,
        )

    if rpc_url is None:
        # Fallback to a public RPC for read-only if not provided
        rpc_url = "https://cloudflare-eth.com"

    return Web3RpcConnectorClient(rpc_url=rpc_url, converter=converter)


__all__ = [
    "NormalizedTransaction",
    "ConnectorClient",
    "MockConnectorClient",
    "CcxtConnectorClient",
    "Web3RpcConnectorClient",
    "normalize_transaction",
    "build_connector",
]
