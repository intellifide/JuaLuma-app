# Updated 2026-01-20 23:59 CST
import json
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from backend.integrations.blockfrost import cardano as blockfrost_cardano
from backend.integrations.blockfrost import client as blockfrost_client
from backend.services import crypto_history
from backend.services.connectors import NormalizedTransaction


class _FakeResponse:
    def __init__(self, payload, status_code=200, text="ok"):
        self._payload = payload
        self.status_code = status_code
        self.text = text

    def json(self):
        return self._payload


def test_blockfrost_get_requires_api_key(monkeypatch):
    monkeypatch.setattr(blockfrost_client.settings, "blockfrost_api_key", None)
    with pytest.raises(RuntimeError, match="BLOCKFROST_API_KEY"):
        blockfrost_client.blockfrost_get("/health")


def test_blockfrost_get_success(monkeypatch):
    monkeypatch.setattr(blockfrost_client.settings, "blockfrost_api_key", "key")
    monkeypatch.setattr(blockfrost_client, "_RATE_LIMIT_INTERVAL", 0.0)

    def fake_get(url, params=None, headers=None, timeout=15):
        return _FakeResponse({"status": "ok"}, status_code=200)

    monkeypatch.setattr(blockfrost_client.requests, "get", fake_get)

    payload = blockfrost_client.blockfrost_get("/health")
    assert payload == {"status": "ok"}


def test_fetch_cardano_history_blockfrost_outflow(monkeypatch):
    address = "addr_test"

    def fake_blockfrost_get(endpoint, params=None, timeout=15):
        if endpoint.endswith("/transactions"):
            if params and params.get("page") == 1:
                return [{"tx_hash": "tx1"}]
            return []
        if endpoint == "/txs/tx1":
            return {"block_time": 1700000000, "fees": "200000"}
        if endpoint == "/txs/tx1/utxos":
            return {
                "inputs": [
                    {
                        "address": address,
                        "amount": [{"unit": "lovelace", "quantity": "3000000"}],
                    }
                ],
                "outputs": [
                    {
                        "address": "addr_other",
                        "amount": [{"unit": "lovelace", "quantity": "2500000"}],
                    },
                    {
                        "address": address,
                        "amount": [{"unit": "lovelace", "quantity": "500000"}],
                    },
                ],
            }
        raise AssertionError(f"Unexpected endpoint: {endpoint}")

    monkeypatch.setattr(blockfrost_cardano, "blockfrost_get", fake_blockfrost_get)

    txs = blockfrost_cardano.fetch_cardano_history_blockfrost(address)
    assert len(txs) == 1

    tx = txs[0]
    assert tx.tx_id == "tx1"
    assert tx.direction == "outflow"
    assert tx.counterparty == "addr_other"
    assert tx.amount == Decimal("2.5")
    assert tx.currency_code == "ADA"
    assert tx.on_chain_units == "2500000"


def test_crypto_history_cardano_fallback(monkeypatch):
    address = "addr_test"
    account = SimpleNamespace(
        secret_ref=json.dumps({"address": address, "chain": "cardano:mainnet"})
    )
    fallback_tx = NormalizedTransaction(
        amount=Decimal("1"),
        currency_code="ADA",
        timestamp=datetime.now(UTC),
        merchant_name=None,
        counterparty=None,
        tx_id="tx-fallback",
        account_id=address,
        type="transfer",
        direction="inflow",
        on_chain_units=Decimal("1000000"),
        on_chain_symbol="ADA",
        raw={},
    )

    def fake_bitquery(_address):
        raise RuntimeError("Bitquery down")

    def fake_blockfrost(_address):
        return [fallback_tx]

    monkeypatch.setattr(crypto_history, "fetch_cardano_history_bitquery", fake_bitquery)
    monkeypatch.setattr(
        crypto_history, "fetch_cardano_history_blockfrost", fake_blockfrost
    )
    monkeypatch.setenv("ENABLE_BLOCKFROST", "true")

    result = crypto_history.fetch_crypto_history(account)
    assert result == [fallback_tx]
