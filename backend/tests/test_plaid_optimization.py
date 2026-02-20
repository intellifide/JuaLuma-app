from __future__ import annotations

import hashlib
import hmac
import importlib.util
import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.core.config import settings
from backend.models import (
    Account,
    PlaidItem,
    PlaidItemAccount,
    PlaidWebhookEvent,
    Transaction,
)
from backend.services.plaid_sync import PLAID_SYNC_STATUS_SYNC_NEEDED, sync_plaid_item


def _sign_plaid_payload(payload_raw: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_raw, hashlib.sha256).hexdigest()
    return f"v1={digest}"


def test_plaid_migration_backfills_items_from_legacy_accounts(test_db, mock_auth):
    account_one = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Bank A",
        account_name="Checking 1",
        account_number_masked="1111",
        secret_ref="legacy-secret-ref",
        balance=Decimal("100.00"),
        currency="USD",
    )
    account_two = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Bank A",
        account_name="Checking 2",
        account_number_masked="2222",
        secret_ref="legacy-secret-ref",
        balance=Decimal("200.00"),
        currency="USD",
    )
    test_db.add_all([account_one, account_two])
    test_db.commit()

    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "1f3a9c7d8e2b_add_plaid_item_cursor_sync_tables.py"
    )
    module_spec = importlib.util.spec_from_file_location(
        "plaid_migration_module", migration_path
    )
    assert module_spec and module_spec.loader
    migration_module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(migration_module)
    migration_module._backfill_plaid_items(test_db.connection())
    test_db.commit()

    items = test_db.query(PlaidItem).filter(PlaidItem.uid == mock_auth.uid).all()
    assert len(items) == 1
    assert items[0].sync_status == "sync_needed"
    assert items[0].secret_ref == "legacy-secret-ref"

    links = (
        test_db.query(PlaidItemAccount)
        .filter(PlaidItemAccount.plaid_item_id == items[0].id)
        .all()
    )
    assert len(links) == 2


def test_delete_single_account_does_not_unlink_shared_plaid_item(
    test_client: TestClient,
    test_db,
    mock_auth,
):
    item = PlaidItem(
        uid=mock_auth.uid,
        item_id="item-shared-1",
        institution_name="Shared Bank",
        secret_ref="access-token-shared",
        sync_status="active",
        is_active=True,
    )
    account_one = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Shared Bank",
        account_name="Checking 1",
        account_number_masked="1234",
        secret_ref="access-token-shared",
        balance=Decimal("100.00"),
        currency="USD",
    )
    account_two = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Shared Bank",
        account_name="Checking 2",
        account_number_masked="5678",
        secret_ref="access-token-shared",
        balance=Decimal("50.00"),
        currency="USD",
    )
    test_db.add_all([item, account_one, account_two])
    test_db.flush()

    link_one = PlaidItemAccount(
        uid=mock_auth.uid,
        plaid_item_id=item.id,
        account_id=account_one.id,
        plaid_account_id="plaid-acct-1",
        is_active=True,
    )
    link_two = PlaidItemAccount(
        uid=mock_auth.uid,
        plaid_item_id=item.id,
        account_id=account_two.id,
        plaid_account_id="plaid-acct-2",
        is_active=True,
    )
    test_db.add_all([link_one, link_two])
    test_db.commit()

    with patch("backend.api.accounts.remove_item") as remove_item_mock:
        response = test_client.delete(f"/api/accounts/{account_one.id}")
        assert response.status_code == 200
        remove_item_mock.assert_not_called()

    test_db.refresh(item)
    assert item.is_active is True
    assert item.removed_at is None


def test_delete_last_account_unlinks_plaid_item(
    test_client: TestClient,
    test_db,
    mock_auth,
):
    item = PlaidItem(
        uid=mock_auth.uid,
        item_id="item-last-1",
        institution_name="Single Bank",
        secret_ref="access-token-single",
        sync_status="active",
        is_active=True,
    )
    account = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Single Bank",
        account_name="Checking",
        account_number_masked="9999",
        secret_ref="access-token-single",
        balance=Decimal("75.00"),
        currency="USD",
    )
    test_db.add_all([item, account])
    test_db.flush()
    link = PlaidItemAccount(
        uid=mock_auth.uid,
        plaid_item_id=item.id,
        account_id=account.id,
        plaid_account_id="plaid-acct-single",
        is_active=True,
    )
    test_db.add(link)
    test_db.commit()

    with patch("backend.api.accounts.remove_item") as remove_item_mock, patch(
        "backend.api.accounts.delete_secret"
    ) as delete_secret_mock:
        response = test_client.delete(f"/api/accounts/{account.id}")
        assert response.status_code == 200
        remove_item_mock.assert_called_once()
        delete_secret_mock.assert_called_once_with("access-token-single", uid=mock_auth.uid)

    test_db.refresh(item)
    assert item.is_active is False
    assert item.removed_at is not None
    assert item.sync_status == "removed"


def test_plaid_webhook_signature_and_dedupe(test_client: TestClient, test_db, mock_auth):
    settings.plaid_webhook_secret = "plaid-webhook-test-secret"

    item = PlaidItem(
        uid=mock_auth.uid,
        item_id="item-webhook-1",
        institution_name="Webhook Bank",
        secret_ref="webhook-secret-ref",
        sync_status="active",
        is_active=True,
    )
    test_db.add(item)
    test_db.commit()

    payload = {
        "item_id": "item-webhook-1",
        "webhook_type": "TRANSACTIONS",
        "webhook_code": "SYNC_UPDATES_AVAILABLE",
        "new_transactions": 1,
    }
    payload_raw = json.dumps(payload).encode("utf-8")
    signature = _sign_plaid_payload(payload_raw, settings.plaid_webhook_secret)

    response = test_client.post(
        "/webhook/plaid",
        content=payload_raw,
        headers={
            "Content-Type": "application/json",
            "Plaid-Signature": signature,
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    test_db.refresh(item)
    assert item.sync_status == PLAID_SYNC_STATUS_SYNC_NEEDED

    duplicate = test_client.post(
        "/webhook/plaid",
        content=payload_raw,
        headers={
            "Content-Type": "application/json",
            "Plaid-Signature": signature,
        },
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["status"] == "duplicate"
    assert test_db.query(PlaidWebhookEvent).count() == 1


def test_plaid_sync_is_idempotent_on_replay(test_db, mock_auth):
    now = datetime.now(UTC)
    account = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Replay Bank",
        account_name="Replay Checking",
        account_number_masked="4444",
        balance=Decimal("0"),
        currency="USD",
    )
    item = PlaidItem(
        uid=mock_auth.uid,
        item_id="item-replay-1",
        institution_name="Replay Bank",
        secret_ref="replay-secret-ref",
        next_cursor=None,
        sync_status="sync_needed",
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    test_db.add_all([account, item])
    test_db.flush()
    link = PlaidItemAccount(
        uid=mock_auth.uid,
        plaid_item_id=item.id,
        account_id=account.id,
        plaid_account_id="plaid-replay-acct",
        is_active=True,
        last_seen_at=now,
    )
    test_db.add(link)
    test_db.commit()

    plaid_accounts = [
        {
            "account_id": "plaid-replay-acct",
            "name": "Replay Checking",
            "official_name": "Replay Checking",
            "mask": "4444",
            "type": "depository",
            "subtype": "checking",
            "balance_current": 321.12,
            "currency": "USD",
        }
    ]
    page_payload = {
        "added": [
            {
                "transaction_id": "tx-replay-1",
                "account_id": "plaid-replay-acct",
                "name": "Coffee Shop",
                "merchant_name": "Coffee Shop",
                "amount": Decimal("5.25"),
                "date": datetime(2026, 2, 10, tzinfo=UTC).date(),
                "category": ["Food and Drink"],
                "currency": "USD",
                "pending": False,
                "raw": {"transaction_id": "tx-replay-1"},
            }
        ],
        "modified": [],
        "removed": [],
        "has_more": False,
        "next_cursor": "cursor-1",
    }

    with (
        patch("backend.services.plaid_sync.get_secret", return_value="access-token"),
        patch("backend.services.plaid_sync.fetch_accounts", return_value=plaid_accounts),
        patch("backend.services.plaid_sync.fetch_transactions_sync_page", return_value=page_payload),
    ):
        first = sync_plaid_item(test_db, item, trigger="test")
        second = sync_plaid_item(test_db, item, trigger="test")

    assert first["status"] == "active"
    assert second["status"] == "active"
    txns = (
        test_db.query(Transaction)
        .filter(Transaction.uid == mock_auth.uid, Transaction.account_id == account.id)
        .all()
    )
    assert len(txns) == 1
    assert txns[0].external_id == "tx-replay-1"
    assert txns[0].archived is False


def test_plaid_manual_sync_endpoints_are_disabled(test_client: TestClient, test_db, mock_auth):
    account = Account(
        uid=mock_auth.uid,
        account_type="traditional",
        provider="Auto Bank",
        account_name="Auto Checking",
        secret_ref="auto-secret-ref",
    )
    test_db.add(account)
    test_db.commit()

    sync_response = test_client.post(f"/api/accounts/{account.id}/sync")
    assert sync_response.status_code == 409
    assert "automatically" in sync_response.json()["detail"].lower()

    refresh_response = test_client.post(f"/api/accounts/{account.id}/refresh-metadata")
    assert refresh_response.status_code == 409
    assert "automatic" in refresh_response.json()["detail"].lower()
