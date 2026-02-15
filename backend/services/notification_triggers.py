"""Core Purpose: Evaluate notification triggers beyond user preferences."""

# Last Updated: 2026-02-03 00:00 CST

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models import Account, Transaction, User
from backend.services.notifications import NotificationService

logger = logging.getLogger(__name__)


def _format_currency(amount: Decimal | float) -> str:
    try:
        return f"${float(amount):,.2f}"
    except Exception:
        return f"${amount}"


def evaluate_transaction_triggers(
    db: Session,
    user: User,
    transaction: Transaction,
) -> None:
    """Dispatch large transaction alerts if thresholds are met."""
    notifier = NotificationService(db)
    settings = notifier.get_settings(user.uid)
    threshold = settings.large_transaction_threshold
    if threshold is None:
        return

    try:
        txn_amount = abs(Decimal(transaction.amount))
    except Exception:
        return

    if txn_amount < Decimal(threshold):
        return

    merchant = transaction.merchant_name or transaction.description or "transaction"
    title = "Large transaction alert"
    message = f"A {merchant} transaction of {_format_currency(txn_amount)} was detected."
    dedupe_key = f"large_transaction:{transaction.id}"
    notifier.create_notification_for_event(
        user,
        "large_transaction",
        title,
        message,
        dedupe_key=dedupe_key,
    )


def evaluate_low_balance(
    db: Session,
    user: User,
    account: Account,
) -> None:
    """Dispatch low balance alerts based on account balances."""
    notifier = NotificationService(db)
    settings = notifier.get_settings(user.uid)
    threshold = settings.low_balance_threshold
    if threshold is None:
        return

    if account.balance is None:
        return

    try:
        balance = Decimal(account.balance)
    except Exception:
        return

    if balance > Decimal(threshold):
        return

    title = "Low balance alert"
    message = f"Your {account.name or 'account'} balance is {_format_currency(balance)}."
    dedupe_key = f"low_balance:{account.id}:{date.today().isoformat()}"
    notifier.create_notification_for_event(
        user,
        "low_balance",
        title,
        message,
        dedupe_key=dedupe_key,
    )


def send_weekly_digest(db: Session, uid: str, *, now: datetime | None = None) -> None:
    """Send a weekly digest notification with summary spend/income totals."""
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        return

    ref = now or datetime.now(UTC)
    start = ref - timedelta(days=7)
    spend = (
        db.query(
            func.coalesce(
                func.sum(func.abs(Transaction.amount)), 0
            )
        )
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start,
            Transaction.ts <= ref,
            Transaction.amount < 0,
        )
        .scalar()
    )
    income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start,
            Transaction.ts <= ref,
            Transaction.amount > 0,
        )
        .scalar()
    )

    title = "Weekly financial digest"
    message = (
        f"Last 7 days: spent {_format_currency(spend)} and earned {_format_currency(income)}."
    )
    dedupe_key = f"weekly_digest:{start.date().isoformat()}"
    NotificationService(db).create_notification_for_event(
        user,
        "weekly_digest",
        title,
        message,
        dedupe_key=dedupe_key,
    )


def send_marketing_update(db: Session, uid: str, title: str, message: str) -> None:
    """Send a marketing update notification to a user."""
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        return
    NotificationService(db).create_notification_for_event(
        user,
        "marketing_updates",
        title,
        message,
        dedupe_key=f"marketing_updates:{uid}:{hash(title + message)}",
    )


def notify_sync_failure(db: Session, user: User, account: Account, error: str) -> None:
    """Notify the user that a sync failed."""
    title = "Account sync failed"
    message = (
        f"We couldn't sync {account.name or 'your account'}. Please try again later."
    )
    dedupe_key = f"sync_failure:{account.id}:{date.today().isoformat()}"
    NotificationService(db).create_notification_for_event(
        user,
        "sync_failure",
        title,
        message,
        dedupe_key=dedupe_key,
    )
