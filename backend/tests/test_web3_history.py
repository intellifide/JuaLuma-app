import json

from backend.services import web3_history


def test_evm_history_cursor_advances(monkeypatch):
    monkeypatch.setattr(web3_history.settings, "etherscan_api_key", "test-key")
    monkeypatch.setattr(web3_history.settings, "etherscan_base_url", "https://example.com")

    def fake_request(method, url, params=None, json_body=None, headers=None, timeout=10):
        return (
            {
                "status": "1",
                "message": "OK",
                "result": [
                    {
                        "hash": "0xabc",
                        "timeStamp": "1700000000",
                        "from": "0xaaa",
                        "to": "0xbbb",
                        "value": "1000000000000000000",
                    }
                ],
            },
            {},
        )

    monkeypatch.setattr(web3_history, "_request_json", fake_request)

    result = web3_history.fetch_web3_history("0xaaa", "eip155:1", None)
    assert result.update_cursor is True
    assert len(result.transactions) == 1
    assert result.next_cursor is not None

    cursor = json.loads(result.next_cursor)
    assert cursor["action"] == "tokentx"


def test_evm_history_disabled_without_key(monkeypatch):
    monkeypatch.setattr(web3_history.settings, "etherscan_api_key", None)

    result = web3_history.fetch_web3_history("0xaaa", "eip155:1", "cursor")
    assert result.update_cursor is False
    assert result.next_cursor == "cursor"
    assert result.transactions == []
