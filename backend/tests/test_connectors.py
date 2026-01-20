# Updated 2025-12-11 02:55 CST by ChatGPT
import datetime
from decimal import Decimal

import pytest

from backend.services.connectors import (
    CcxtConnectorClient,
    EVMConnector,
    NormalizedTransaction,
    SolanaConnector,
    build_connector,
    normalize_transaction,
)


def test_normalize_transaction_coerces_and_sets_defaults():
    payload = {
        "amount": "10.5",
        "currency_code": "usd",
        "timestamp": "2024-01-01T00:00:00Z",
        "tx_id": "abc",
        "account_id": "acct-1",
        "type": "deposit",
        "direction": "inflow",
    }
    record = normalize_transaction(payload)
    assert isinstance(record, NormalizedTransaction)
    assert record.amount == Decimal("10.5")
    assert record.currency_code == "USD"
    assert record.timestamp.tzinfo is not None
    assert record.tx_id == "abc"


def test_build_connector_returns_real_clients_for_local_env():
    connector = build_connector("cex", app_env="local")
    assert isinstance(connector, CcxtConnectorClient)


def test_build_connector_returns_evm_connector_by_default():
    connector = build_connector("web3", app_env="local")
    assert isinstance(connector, EVMConnector)


def test_build_connector_respects_provider():
    connector = build_connector("web3", provider="solana", app_env="local")
    assert isinstance(connector, SolanaConnector)


def test_normalize_requires_timestamp():
    with pytest.raises(ValueError):
        normalize_transaction(
            {
                "amount": 1,
                "currency_code": "USD",
                "tx_id": "missing-ts",
                "account_id": "acct",
                "type": "deposit",
                "direction": "inflow",
            }
        )


def test_timezone_is_applied():
    naive_payload = {
        "amount": 5,
        "currency_code": "USD",
        "timestamp": datetime.datetime(2024, 2, 1, 12, 0, 0),
        "tx_id": "naive",
        "account_id": "acct",
        "type": "deposit",
        "direction": "inflow",
    }
    record = normalize_transaction(naive_payload)
    assert record.timestamp.tzinfo is not None
