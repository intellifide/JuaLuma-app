import json

import pytest

from backend.services import tatum_history


def test_fetch_evm_history_normalizes_and_advances_cursor(monkeypatch):
    monkeypatch.setattr(tatum_history, "EVM_PAGE_SIZE", 2)

    def fake_get(path, *, params=None, timeout=None):
        assert path == "/v4/data/transaction/history"
        assert params["chain"] == "ethereum-mainnet"
        return (
            {
                "result": [
                    {
                        "hash": "0xaaa",
                        "transactionType": "native",
                        "transactionSubtype": "incoming",
                        "amount": "1.25",
                        "timestamp": 1_771_000_000_000,
                        "counterAddress": "0x111",
                    },
                    {
                        "hash": "0xbbb",
                        "transactionType": "fungible",
                        "transactionSubtype": "outgoing",
                        "tokenAddress": "0xtoken",
                        "amount": "2.50",
                        "timestamp": 1_771_000_100_000,
                        "counterAddress": "0x222",
                    },
                ]
            },
            {},
        )

    monkeypatch.setattr(tatum_history, "_tatum_get", fake_get)
    result = tatum_history.fetch_tatum_history(
        "0xabc", "eip155:1", None
    )

    assert result.update_cursor is True
    assert len(result.transactions) == 2
    assert result.transactions[0].direction == "inflow"
    assert result.transactions[0].currency_code == "ETH"
    assert result.transactions[1].direction == "outflow"
    assert result.transactions[1].currency_code == "0XTOKEN"
    assert result.next_cursor is not None
    assert json.loads(result.next_cursor)["offset"] == 2


def test_fetch_bitcoin_history_is_idempotent_for_same_cursor(monkeypatch):
    def fake_get(path, *, params=None, timeout=None):
        assert path.startswith("/v3/bitcoin/transaction/address/")
        return (
            [
                {
                    "hash": "btc-tx-1",
                    "time": 1_771_000_000,
                    "inputs": [{"coin": {"address": "1abc", "value": 125000000}}],
                    "outputs": [{"address": "1abc", "value": 150000000}],
                }
            ],
            {},
        )

    monkeypatch.setattr(tatum_history, "_tatum_get", fake_get)

    first = tatum_history.fetch_tatum_history(
        "1abc", "bip122:000000000019d6689c085ae165831e93", None
    )
    second = tatum_history.fetch_tatum_history(
        "1abc", "bip122:000000000019d6689c085ae165831e93", None
    )

    assert [tx.tx_id for tx in first.transactions] == [tx.tx_id for tx in second.transactions]
    assert first.next_cursor == second.next_cursor
    assert first.transactions[0].direction == "inflow"
    assert str(first.transactions[0].amount) == "0.25"


def test_request_json_retries_429_then_raises_overloaded(monkeypatch):
    class FakeResponse:
        status_code = 429
        ok = False
        text = "rate limited"
        headers = {}

        @staticmethod
        def json():
            return {"message": "rate limited"}

    class FakeRequests:
        def __init__(self):
            self.calls = 0

        def get(self, *args, **kwargs):
            self.calls += 1
            return FakeResponse()

    fake_requests = FakeRequests()

    monkeypatch.setattr(tatum_history.settings, "tatum_retry_max_attempts", 3)
    monkeypatch.setattr(tatum_history.settings, "tatum_retry_base_backoff_ms", 1)
    monkeypatch.setattr(tatum_history.time, "sleep", lambda *_: None)
    monkeypatch.setattr(
        tatum_history.importlib,
        "import_module",
        lambda name: fake_requests if name == "requests" else __import__(name),
    )

    with pytest.raises(tatum_history.ProviderOverloaded):
        tatum_history._request_json("GET", "https://example.com")

    assert fake_requests.calls == 3


def test_fetch_xrp_history_parses_account_tx(monkeypatch):
    def fake_rpc(network, body, *, timeout=None):
        assert network == "ripple-mainnet"
        assert body["method"] == "account_tx"
        return (
            {
                "result": {
                    "transactions": [
                        {
                            "tx": {
                                "hash": "xrp-hash",
                                "TransactionType": "Payment",
                                "Account": "rSource",
                                "Destination": "rTarget",
                                "Amount": "1000000",
                                "date": 700_000_000,
                            }
                        }
                    ]
                }
            },
            {},
        )

    monkeypatch.setattr(tatum_history, "_tatum_rpc", fake_rpc)
    result = tatum_history.fetch_tatum_history("rTarget", "ripple:mainnet", None)

    assert len(result.transactions) == 1
    tx = result.transactions[0]
    assert tx.direction == "inflow"
    assert str(tx.amount) == "1"
    assert tx.currency_code == "XRP"
