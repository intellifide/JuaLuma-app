"""Core Purpose: Detect recurring transactions and forecast upcoming bills."""

# Last Updated: 2026-01-28 12:05 CST

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import hashlib
import logging
import re
from statistics import median

from sqlalchemy.orm import Session

from backend.models import Transaction, User
from backend.services.notifications import NotificationService

logger = logging.getLogger(__name__)


@dataclass
class RecurringForecastItem:
    merchant: str
    category: str | None
    average_amount: float
    cadence: str
    cadence_days: int
    next_date: date
    last_date: date
    occurrence_count: int
    confidence: float


_NON_ALPHA = re.compile(r"[^a-z0-9 ]+")
_MULTI_SPACE = re.compile(r"\s+")
_LONG_NUMBER = re.compile(r"\b\d{2,}\b")


def _normalize_label(value: str | None) -> str:
    if not value:
        return "unknown"
    cleaned = value.lower()
    cleaned = _NON_ALPHA.sub(" ", cleaned)
    cleaned = _LONG_NUMBER.sub("", cleaned)
    cleaned = _MULTI_SPACE.sub(" ", cleaned).strip()
    return cleaned[:80] or "unknown"


def _match_cadence(days: int) -> tuple[str, int] | None:
    if 6 <= days <= 8:
        return "weekly", 7
    if 12 <= days <= 16:
        return "biweekly", 14
    if 27 <= days <= 33:
        return "monthly", 30
    if 88 <= days <= 94:
        return "quarterly", 91
    if 350 <= days <= 380:
        return "annual", 365
    return None


def _within_tolerance(value: int, target: int, tolerance: int) -> bool:
    return abs(value - target) <= tolerance


def _dedupe_key(label: str, next_date: date) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", label).strip("-")
    if not slug:
        slug = "recurring"
    if len(slug) > 40:
        slug = slug[:40]
    digest = hashlib.sha1(label.encode("utf-8")).hexdigest()[:8]
    return f"recurring_bill:{slug}:{digest}:{next_date.isoformat()}"


def detect_recurring_transactions(
    db: Session,
    uid: str,
    *,
    lookback_days: int = 180,
    min_occurrences: int = 3,
    tolerance_days: int = 3,
) -> list[RecurringForecastItem]:
    """Detect recurring transactions using simple cadence/amount heuristics."""
    cutoff = datetime.now(UTC) - timedelta(days=lookback_days)
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.amount < 0,
            Transaction.ts >= cutoff,
        )
        .order_by(Transaction.ts.asc())
        .all()
    )

    grouped: dict[str, list[Transaction]] = {}
    for txn in txns:
        label = txn.merchant_name or txn.description or "Unknown"
        normalized = _normalize_label(label)
        key = f"{normalized}::{txn.category or ''}"
        grouped.setdefault(key, []).append(txn)

    results: list[RecurringForecastItem] = []

    for key, items in grouped.items():
        if len(items) < min_occurrences:
            continue

        items_sorted = sorted(items, key=lambda t: t.ts)
        dates = [t.ts.date() for t in items_sorted]
        intervals = [
            (dates[idx] - dates[idx - 1]).days for idx in range(1, len(dates))
        ]
        if len(intervals) < 2:
            continue

        median_interval = int(median(intervals))
        cadence_match = _match_cadence(median_interval)
        if not cadence_match:
            continue
        cadence_label, cadence_days = cadence_match

        matches = sum(
            1 for interval in intervals if _within_tolerance(interval, cadence_days, tolerance_days)
        )
        if matches < max(2, len(intervals) // 2):
            continue

        amounts = [abs(float(t.amount)) for t in items_sorted]
        median_amount = median(amounts)
        if median_amount <= 0:
            continue
        consistent = sum(
            1
            for amount in amounts
            if abs(amount - median_amount) / median_amount <= 0.3
        )
        if consistent < max(2, int(len(amounts) * 0.6)):
            continue

        last_date = dates[-1]
        next_date = last_date + timedelta(days=cadence_days)
        confidence = min(1.0, (matches / max(1, len(intervals))))
        normalized_label, category = key.split("::", 1)
        merchant_label = normalized_label.title()
        category_label = category or None

        results.append(
            RecurringForecastItem(
                merchant=merchant_label,
                category=category_label,
                average_amount=float(median_amount),
                cadence=cadence_label,
                cadence_days=cadence_days,
                next_date=next_date,
                last_date=last_date,
                occurrence_count=len(items_sorted),
                confidence=confidence,
            )
        )

    return results


def get_recurring_forecast(
    db: Session,
    uid: str,
    *,
    lookahead_days: int = 30,
    lookback_days: int = 180,
) -> list[RecurringForecastItem]:
    """Return forecast items within the lookahead window."""
    today = datetime.now(UTC).date()
    horizon = today + timedelta(days=lookahead_days)
    candidates = detect_recurring_transactions(db, uid, lookback_days=lookback_days)
    forecast = [
        item
        for item in candidates
        if today <= item.next_date <= horizon
    ]
    forecast.sort(key=lambda item: item.next_date)
    return forecast


def send_recurring_notifications(
    db: Session,
    uid: str,
    *,
    lookahead_days: int = 30,
    notify_window_days: int = 7,
) -> list[RecurringForecastItem]:
    """Send notifications for upcoming recurring bills."""
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        return []

    forecast = get_recurring_forecast(db, uid, lookahead_days=lookahead_days)
    if not forecast:
        return []

    today = datetime.now(UTC).date()
    notify_cutoff = today + timedelta(days=notify_window_days)
    notifier = NotificationService(db)
    notified: list[RecurringForecastItem] = []

    for item in forecast:
        if item.next_date > notify_cutoff:
            continue
        dedupe_key = _dedupe_key(item.merchant, item.next_date)
        title = f"Upcoming bill: {item.merchant}"
        message = (
            f"{item.merchant} is expected around {item.next_date:%b %d}. "
            f"Estimated amount ${item.average_amount:,.0f}."
        )
        created = notifier.create_notification_for_event(
            user,
            "recurring_bill",
            title,
            message,
            dedupe_key=dedupe_key,
        )
        if created:
            notified.append(item)

    return notified
