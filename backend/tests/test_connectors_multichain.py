import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
from datetime import datetime, timezone
from backend.services.connectors import (
    BitcoinConnector,
    SolanaConnector,
    RippleConnector,
    CardanoConnector,
    TronConnector,
    build_connector,
    EVMConnector
)

# --- Mock Response Helpers ---

def mock_response(json_data, status_code=200):
    mock = MagicMock()
    mock.ok = status_code >= 200 and status_code < 300
    mock.json.return_value = json_data
    return mock

# --- Bitcoin Tests ---

@patch("backend.services.connectors.importlib.import_module")
def test_bitcoin_connector_fetch(mock_import):
    # Mock requests module
    mock_requests = MagicMock()
    mock_import.return_value = mock_requests
    
    # Mock API response
    tx_data = [{
        "txid": "btc_tx_1",
        "status": {"confirmed": True, "block_time": 1700000000},
        "vin": [{"value": 50000, "prevout": {"scriptpubkey_address": "other_addr"}}],
        "vout": [{"value": 150000, "scriptpubkey_address": "my_btc_addr"}]
    }]
    mock_requests.get.return_value = mock_response(tx_data)

    connector = BitcoinConnector()
    txs = connector.fetch_transactions("my_btc_addr")
    
    assert len(txs) == 1
    assert txs[0].tx_id == "btc_tx_1"
    assert txs[0].currency_code == "BTC"
    # Net flow: 150000 (received) - 0 (spent by me) = 150000 sats = 0.0015 BTC
    assert txs[0].amount == Decimal("0.0015")
    assert txs[0].direction == "inflow"

# --- Solana Tests ---

@patch("backend.services.connectors.importlib.import_module")
def test_solana_connector_fetch(mock_import):
    mock_requests = MagicMock()
    mock_import.return_value = mock_requests
    
    # 1. getSignaturesForAddress response
    mock_requests.post.side_effect = [
        mock_response({"result": [{"signature": "sol_sig_1"}]}),
        mock_response({"result": {"blockTime": 1700000000, "meta": {}}})
    ]

    connector = SolanaConnector()
    txs = connector.fetch_transactions("my_sol_addr")
    
    assert len(txs) == 1
    assert txs[0].tx_id == "sol_sig_1"
    assert txs[0].currency_code == "SOL"
    assert txs[0].direction == "outflow" # Default behavior for now

# --- Ripple Tests ---

@patch("backend.services.connectors.importlib.import_module")
def test_ripple_connector_fetch(mock_import):
    mock_requests = MagicMock()
    mock_import.return_value = mock_requests
    
    # Mock Ripple Epoch time handling if needed, or just standard import
    # The connector imports datetime inside the method, so we mock the entire module return
    # But for simplicity, we mock requests.
    
    xrp_data = {
        "result": {
            "transactions": [{
                "tx": {
                    "hash": "xrp_tx_1",
                    "Account": "other_xrp_addr",
                    "Amount": "1000000", # 1 XRP
                    "date": 768614400 # Some ripple timestamp
                },
                "meta": {}
            }]
        }
    }
    mock_requests.post.return_value = mock_response(xrp_data)

    connector = RippleConnector()
    txs = connector.fetch_transactions("my_xrp_addr")
    
    assert len(txs) == 1
    assert txs[0].tx_id == "xrp_tx_1"
    assert txs[0].amount == Decimal("1.0")
    assert txs[0].currency_code == "XRP"
    assert txs[0].direction == "inflow" # From other to me (implied by Account != my_addr)

# --- Factory Tests ---

def test_build_connector_factory():
    c1 = build_connector("web3", provider="bitcoin", app_env="production")
    assert isinstance(c1, BitcoinConnector)
    
    c2 = build_connector("web3", provider="solana", app_env="production")
    assert isinstance(c2, SolanaConnector)
    
    c3 = build_connector("web3", provider="tron", app_env="production")
    assert isinstance(c3, TronConnector)
    
    c4 = build_connector("web3", app_env="production") # Defaults to EVM
    assert isinstance(c4, EVMConnector)
