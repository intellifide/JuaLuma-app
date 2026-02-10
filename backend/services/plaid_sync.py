"""Plaid item-level cursor sync orchestration."""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, selectinload

from backend.core.config import settings
from backend.core.constants import SubscriptionPlans
from backend.models import (
    Account,
    AuditLog,
    LocalNotification,
    PlaidItem,
    PlaidItemAccount,
    Subscription,
    Transaction,
)
from backend.services.plaid import (
    PlaidItemLoginRequired,
    PlaidSyncMutationDuringPagination,
    fetch_accounts,
    fetch_transactions_sync_page,
    remove_item,
)
from backend.utils.normalization import normalize_category, normalize_merchant_name
from backend.utils.secret_manager import get_secret

logger = logging.getLogger(__name__)

PLAID_SYNC_STATUS_ACTIVE = "active"
PLAID_SYNC_STATUS_SYNC_NEEDED = "sync_needed"
PLAID_SYNC_STATUS_SYNCING = "syncing"
PLAID_SYNC_STATUS_FAILED = "failed"
PLAID_SYNC_STATUS_NEEDS_REAUTH = "needs_reauth"
PLAID_SYNC_STATUS_PENDING_CLEANUP = "pending_cleanup"
PLAID_SYNC_STATUS_REMOVED = "removed"


def _get_active_plan(db: Session, uid: str) -> str:
    sub = (
        db.query(Subscription)
        .filter(Subscription.uid == uid, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if sub:
        return sub.plan

    latest_sub = (
        db.query(Subscription)
        .filter(Subscription.uid == uid)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    return latest_sub.plan if latest_sub else SubscriptionPlans.FREE


def _retention_min_date_for_plan(plan_code: str) -> date | None:
    base_tier = SubscriptionPlans.get_base_tier(plan_code)
    if base_tier == SubscriptionPlans.ESSENTIAL:
        return date.today() - timedelta(days=365)
    return None


def _to_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _to_decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


def _clean_raw(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _clean_raw(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clean_raw(v) for v in value]
    return value


def _build_plaid_raw(item: PlaidItem, plaid_account_id: str | None, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": "plaid",
        "item_id": item.item_id,
        "plaid_account_id": plaid_account_id,
        "payload": _clean_raw(payload),
    }


def _find_matching_plaid_account(account: Account, plaid_accounts: list[dict[str, Any]]) -> dict[str, Any] | None:
    if account.account_number_masked:
        masked_match = next(
            (entry for entry in plaid_accounts if entry.get("mask") == account.account_number_masked),
            None,
        )
        if masked_match:
            return masked_match
    if account.account_name:
        name_lower = account.account_name.strip().lower()
        if name_lower:
            return next(
                (
                    entry
                    for entry in plaid_accounts
                    if (entry.get("official_name") or entry.get("name") or "").strip().lower() == name_lower
                ),
                None,
            )
    return None


def hydrate_plaid_item_account_links(
    db: Session,
    item: PlaidItem,
    access_token: str,
) -> dict[str, PlaidItemAccount]:
    links = (
        db.query(PlaidItemAccount)
        .options(selectinload(PlaidItemAccount.account))
        .filter(
            PlaidItemAccount.plaid_item_id == item.id,
            PlaidItemAccount.is_active.is_(True),
        )
        .all()
    )
    if not links:
        return {}

    plaid_accounts = fetch_accounts(access_token)
    plaid_by_id = {
        str(account_entry.get("account_id")): account_entry
        for account_entry in plaid_accounts
        if account_entry.get("account_id")
    }

    now_utc = datetime.now(UTC)
    for link in links:
        if link.account is None:
            continue

        matched = None
        if link.plaid_account_id:
            matched = plaid_by_id.get(link.plaid_account_id)
        if matched is None:
            matched = _find_matching_plaid_account(link.account, plaid_accounts)
            if matched and matched.get("account_id"):
                link.plaid_account_id = str(matched.get("account_id"))

        if matched:
            link.last_seen_at = now_utc
            if matched.get("balance_current") is not None:
                link.account.balance = _to_decimal(matched.get("balance_current"))
            if matched.get("currency"):
                link.account.currency = str(matched.get("currency"))
            if matched.get("type"):
                link.account.plaid_type = str(matched.get("type"))
            if matched.get("subtype"):
                link.account.plaid_subtype = str(matched.get("subtype"))
            if link.account.sync_status == PLAID_SYNC_STATUS_NEEDS_REAUTH:
                link.account.sync_status = PLAID_SYNC_STATUS_ACTIVE
            db.add(link.account)
        db.add(link)

    db.flush()

    return {
        str(link.plaid_account_id): link
        for link in links
        if link.plaid_account_id and link.account is not None
    }


def _upsert_plaid_transaction(
    db: Session,
    item: PlaidItem,
    account: Account,
    payload: dict[str, Any],
) -> bool:
    transaction_id = payload.get("transaction_id")
    if not transaction_id:
        return False

    txn_date = _to_date(payload.get("date"))
    if txn_date is None:
        return False
    txn_ts = datetime.combine(txn_date, datetime.min.time(), tzinfo=UTC)

    amount = _to_decimal(payload.get("amount"))
    normalized_amount = -amount

    categories = payload.get("category")
    if isinstance(categories, list) and categories:
        category = categories[0]
    else:
        category = None

    merchant_name = normalize_merchant_name(payload.get("merchant_name") or payload.get("name"))
    description = payload.get("name") or payload.get("merchant_name") or merchant_name

    existing = (
        db.query(Transaction)
        .filter(
            Transaction.uid == item.uid,
            Transaction.account_id == account.id,
            Transaction.external_id == str(transaction_id),
        )
        .first()
    )
    if existing:
        existing.ts = txn_ts
        existing.amount = normalized_amount
        existing.currency = str(payload.get("currency") or existing.currency or account.currency or "USD")
        existing.category = normalize_category(category)
        existing.merchant_name = merchant_name
        existing.description = description
        existing.archived = False
        existing.raw_json = _build_plaid_raw(item, str(payload.get("account_id") or ""), payload)
        db.add(existing)
        return False

    db.add(
        Transaction(
            uid=item.uid,
            account_id=account.id,
            ts=txn_ts,
            amount=normalized_amount,
            currency=str(payload.get("currency") or account.currency or "USD"),
            category=normalize_category(category),
            merchant_name=merchant_name,
            description=description,
            external_id=str(transaction_id),
            is_manual=False,
            archived=False,
            raw_json=_build_plaid_raw(item, str(payload.get("account_id") or ""), payload),
        )
    )
    return True


def _tombstone_removed_transactions(
    db: Session,
    *,
    uid: str,
    account_ids: list[Any],
    removed_payloads: list[dict[str, Any]],
) -> int:
    if not account_ids or not removed_payloads:
        return 0

    tombstoned = 0
    now_iso = datetime.now(UTC).isoformat()
    for payload in removed_payloads:
        transaction_id = payload.get("transaction_id")
        if not transaction_id:
            continue
        rows = (
            db.query(Transaction)
            .filter(
                Transaction.uid == uid,
                Transaction.account_id.in_(account_ids),
                Transaction.external_id == str(transaction_id),
                Transaction.is_manual.is_(False),
            )
            .all()
        )
        for row in rows:
            raw_json = dict(row.raw_json or {})
            raw_json["source_removed"] = True
            raw_json["removed_at"] = now_iso
            row.raw_json = raw_json
            row.archived = True
            db.add(row)
            tombstoned += 1
    return tombstoned


def _apply_retention_policy(
    db: Session,
    *,
    uid: str,
    account_ids: list[Any],
    plan_code: str,
) -> int:
    min_date = _retention_min_date_for_plan(plan_code)
    if not min_date or not account_ids:
        return 0

    cutoff = datetime.combine(min_date, datetime.min.time(), tzinfo=UTC)
    deleted_count = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            Transaction.account_id.in_(account_ids),
            Transaction.ts < cutoff,
        )
        .delete(synchronize_session=False)
    )
    return int(deleted_count or 0)


def mark_plaid_item_sync_needed(
    db: Session,
    *,
    item_id: str,
    webhook_received_at: datetime | None = None,
) -> bool:
    item = (
        db.query(PlaidItem)
        .filter(
            PlaidItem.item_id == item_id,
            PlaidItem.is_active.is_(True),
            PlaidItem.removed_at.is_(None),
        )
        .first()
    )
    if not item:
        return False

    now_utc = webhook_received_at or datetime.now(UTC)
    item.last_webhook_at = now_utc
    item.sync_needed_at = now_utc
    if item.sync_status not in {PLAID_SYNC_STATUS_NEEDS_REAUTH, PLAID_SYNC_STATUS_REMOVED}:
        item.sync_status = PLAID_SYNC_STATUS_SYNC_NEEDED
    db.add(item)
    db.commit()
    return True


def sync_plaid_item(
    db: Session,
    item: PlaidItem,
    *,
    trigger: str = "job",
) -> dict[str, Any]:
    now_utc = datetime.now(UTC)
    item.sync_status = PLAID_SYNC_STATUS_SYNCING
    item.last_sync_started_at = now_utc
    db.add(item)
    db.commit()

    try:
        access_token = get_secret(item.secret_ref, uid=item.uid)
        link_by_plaid_account_id = hydrate_plaid_item_account_links(db, item, access_token)

        initial_cursor = item.next_cursor
        page_cursor = initial_cursor
        sync_payloads: list[dict[str, Any]] = []
        modified_payloads: list[dict[str, Any]] = []
        removed_payloads: list[dict[str, Any]] = []

        for attempt in range(2):
            try:
                sync_payloads.clear()
                modified_payloads.clear()
                removed_payloads.clear()
                page_cursor = initial_cursor

                while True:
                    page = fetch_transactions_sync_page(access_token, page_cursor)
                    sync_payloads.extend(page.get("added", []))
                    modified_payloads.extend(page.get("modified", []))
                    removed_payloads.extend(page.get("removed", []))
                    page_cursor = str(page.get("next_cursor") or page_cursor or "")
                    if not page.get("has_more"):
                        break
                break
            except PlaidSyncMutationDuringPagination:
                if attempt == 0:
                    logger.info(
                        "Restarting Plaid sync from stable cursor for item %s after mutation.",
                        item.item_id,
                    )
                    continue
                raise

        account_ids = [link.account_id for link in link_by_plaid_account_id.values()]
        new_count = 0
        updated_count = 0
        touched_account_ids: set[Any] = set()
        for payload in [*sync_payloads, *modified_payloads]:
            plaid_account_id = str(payload.get("account_id") or "")
            link = link_by_plaid_account_id.get(plaid_account_id)
            if not link or not link.account:
                continue
            touched_account_ids.add(link.account_id)
            created = _upsert_plaid_transaction(db, item, link.account, payload)
            if created:
                new_count += 1
            else:
                updated_count += 1

        removed_count = _tombstone_removed_transactions(
            db,
            uid=item.uid,
            account_ids=account_ids,
            removed_payloads=removed_payloads,
        )
        plan_code = _get_active_plan(db, item.uid)
        retention_pruned = _apply_retention_policy(
            db,
            uid=item.uid,
            account_ids=account_ids,
            plan_code=plan_code,
        )

        item.next_cursor = page_cursor or item.next_cursor
        item.sync_status = PLAID_SYNC_STATUS_ACTIVE
        item.last_synced_at = datetime.now(UTC)
        item.sync_needed_at = None
        item.last_sync_error = None
        item.reauth_needed_at = None
        item.cleanup_notified_at = None
        db.add(item)

        if touched_account_ids:
            accounts = (
                db.query(Account)
                .filter(Account.id.in_(touched_account_ids))
                .all()
            )
            for account in accounts:
                account.last_synced_at = item.last_synced_at
                account.sync_status = PLAID_SYNC_STATUS_ACTIVE
                db.add(account)

        db.add(
            AuditLog(
                actor_uid=item.uid,
                target_uid=item.uid,
                action="plaid_item_sync",
                source="backend",
                metadata_json={
                    "item_id": item.item_id,
                    "trigger": trigger,
                    "new_transactions": new_count,
                    "updated_transactions": updated_count,
                    "removed_transactions": removed_count,
                    "retention_pruned": retention_pruned,
                },
            )
        )
        db.commit()

        return {
            "item_id": item.item_id,
            "status": PLAID_SYNC_STATUS_ACTIVE,
            "new_transactions": new_count,
            "updated_transactions": updated_count,
            "removed_transactions": removed_count,
            "retention_pruned": retention_pruned,
        }
    except PlaidItemLoginRequired as exc:
        item.sync_status = PLAID_SYNC_STATUS_NEEDS_REAUTH
        item.reauth_needed_at = datetime.now(UTC)
        item.last_sync_error = str(exc)
        item.sync_needed_at = None
        db.add(item)

        links = (
            db.query(PlaidItemAccount)
            .options(selectinload(PlaidItemAccount.account))
            .filter(PlaidItemAccount.plaid_item_id == item.id)
            .all()
        )
        for link in links:
            if link.account:
                link.account.sync_status = PLAID_SYNC_STATUS_NEEDS_REAUTH
                db.add(link.account)
        db.commit()
        return {"item_id": item.item_id, "status": PLAID_SYNC_STATUS_NEEDS_REAUTH}
    except Exception as exc:
        item.sync_status = PLAID_SYNC_STATUS_FAILED
        item.last_sync_error = str(exc)
        item.sync_needed_at = datetime.now(UTC)
        db.add(item)
        db.commit()
        logger.exception("Plaid item sync failed for %s", item.item_id)
        return {"item_id": item.item_id, "status": PLAID_SYNC_STATUS_FAILED, "error": str(exc)}


def process_due_plaid_items(
    db: Session,
    *,
    batch_size: int | None = None,
    include_safety_net: bool = False,
) -> dict[str, Any]:
    effective_batch_size = batch_size or settings.plaid_sync_batch_size
    now_utc = datetime.now(UTC)
    safety_cutoff = now_utc - timedelta(minutes=settings.plaid_safety_net_minutes)

    base_filters = [
        PlaidItem.is_active.is_(True),
        PlaidItem.removed_at.is_(None),
    ]
    if include_safety_net:
        due_filter = or_(
            PlaidItem.sync_status.in_([PLAID_SYNC_STATUS_SYNC_NEEDED, PLAID_SYNC_STATUS_FAILED]),
            PlaidItem.last_synced_at.is_(None),
            and_(
                PlaidItem.sync_status == PLAID_SYNC_STATUS_ACTIVE,
                PlaidItem.last_synced_at < safety_cutoff,
            ),
        )
    else:
        due_filter = PlaidItem.sync_status.in_([PLAID_SYNC_STATUS_SYNC_NEEDED, PLAID_SYNC_STATUS_FAILED])

    items = (
        db.query(PlaidItem)
        .filter(*base_filters, due_filter)
        .order_by(PlaidItem.sync_needed_at.asc(), PlaidItem.updated_at.asc())
        .limit(effective_batch_size)
        .all()
    )

    processed = 0
    success = 0
    failed = 0
    reauth = 0
    results: list[dict[str, Any]] = []
    for item in items:
        processed += 1
        result = sync_plaid_item(
            db,
            item,
            trigger="safety_net" if include_safety_net else "webhook",
        )
        results.append(result)
        status = result.get("status")
        if status == PLAID_SYNC_STATUS_ACTIVE:
            success += 1
        elif status == PLAID_SYNC_STATUS_NEEDS_REAUTH:
            reauth += 1
        else:
            failed += 1

    return {
        "processed": processed,
        "success": success,
        "failed": failed,
        "reauth_needed": reauth,
        "results": results,
    }


def cleanup_dormant_plaid_items(
    db: Session,
    *,
    inactive_days: int | None = None,
    grace_days: int | None = None,
) -> dict[str, int]:
    now_utc = datetime.now(UTC)
    inactivity_window = timedelta(days=inactive_days or settings.plaid_cleanup_inactive_days)
    grace_window = timedelta(days=grace_days or settings.plaid_cleanup_grace_days)
    stale_before = now_utc - inactivity_window

    items = (
        db.query(PlaidItem)
        .options(selectinload(PlaidItem.account_links).selectinload(PlaidItemAccount.account))
        .filter(
            PlaidItem.is_active.is_(True),
            PlaidItem.removed_at.is_(None),
        )
        .all()
    )

    notified = 0
    removed = 0
    failures = 0
    for item in items:
        last_activity = item.last_synced_at or item.last_webhook_at or item.created_at
        if last_activity >= stale_before:
            continue

        if item.cleanup_notified_at is None:
            db.add(
                LocalNotification(
                    uid=item.uid,
                    event_key=f"plaid_cleanup_warning:{item.item_id}",
                    title="Plaid connection cleanup pending",
                    message=(
                        f"We have not seen recent activity for {item.institution_name or 'your institution'}. "
                        "Reconnect or the connection will be removed to reduce billing."
                    ),
                )
            )
            item.cleanup_notified_at = now_utc
            item.sync_status = PLAID_SYNC_STATUS_PENDING_CLEANUP
            db.add(item)
            notified += 1
            continue

        if now_utc - item.cleanup_notified_at < grace_window:
            continue

        try:
            access_token = get_secret(item.secret_ref, uid=item.uid)
            remove_item(access_token)
            item.is_active = False
            item.removed_at = now_utc
            item.sync_status = PLAID_SYNC_STATUS_REMOVED
            db.add(item)
            for link in item.account_links:
                if link.account:
                    link.account.sync_status = "disconnected"
                    db.add(link.account)
            db.add(
                AuditLog(
                    actor_uid=item.uid,
                    target_uid=item.uid,
                    action="plaid_item_cleanup_removed",
                    source="backend",
                    metadata_json={
                        "item_id": item.item_id,
                        "institution_name": item.institution_name,
                    },
                )
            )
            removed += 1
        except Exception as exc:
            item.sync_status = PLAID_SYNC_STATUS_FAILED
            item.last_sync_error = str(exc)
            db.add(item)
            failures += 1
            logger.exception("Failed to cleanup dormant Plaid item %s", item.item_id)

    db.commit()
    return {"notified": notified, "removed": removed, "failures": failures}


__all__ = [
    "PLAID_SYNC_STATUS_ACTIVE",
    "PLAID_SYNC_STATUS_NEEDS_REAUTH",
    "PLAID_SYNC_STATUS_REMOVED",
    "PLAID_SYNC_STATUS_SYNC_NEEDED",
    "cleanup_dormant_plaid_items",
    "hydrate_plaid_item_account_links",
    "mark_plaid_item_sync_needed",
    "process_due_plaid_items",
    "sync_plaid_item",
]
