from pathlib import Path

import pytest

from backend.core import settings
from backend.utils.secret_manager import delete_secret, get_secret, store_secret


@pytest.fixture
def file_store(tmp_path, monkeypatch):
    store_path = tmp_path / "secret_store.json"
    monkeypatch.setattr(settings, "secret_provider", "file")
    monkeypatch.setattr(settings, "local_secret_store_path", str(store_path))
    return store_path


def test_file_secret_round_trip(file_store: Path):
    ref = store_secret("top-secret", uid="user-1", purpose="cex-test")
    assert ref.startswith("file:")
    value = get_secret(ref, uid="user-1")
    assert value == "top-secret"


def test_file_secret_delete(file_store: Path):
    ref = store_secret("delete-me", uid="user-2", purpose="plaid-access")
    delete_secret(ref, uid="user-2")
    with pytest.raises(KeyError):
        get_secret(ref, uid="user-2")
