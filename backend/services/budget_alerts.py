"""Core Purpose: Evaluate budget thresholds and dispatch alerts."""

# Last Updated: 2026-01-28 12:05 CST

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.models import Budget, Transaction, User
from backend.services.notifications import NotificationService

logger = logging.getLogger(__name__)


@dataclass
class BudgetAlertResult:
    budget_id: str
    category: str
    period_key: str
    amount: float
    spent: float
    threshold_amount: float
    threshold_percent: float


def _resolve_period_window(period: str, today: date) -> tuple[date, date, str]:
    normalized = (period or "monthly").lower()
    if normalized == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        period_key = f"{today.isocalendar().year}-W{today.isocalendar().week:02d}"
        return start, end, period_key

    if normalized == "annual":
        start = date(today.year, 1, 1)
        end = date(today.year, 12, 31)
        period_key = str(today.year)
        return start, end, period_key

    if normalized == "quarterly":
        quarter = ((today.month - 1) // 3) + 1
        start_month = (quarter - 1) * 3 + 1
        start = date(today.year, start_month, 1)
        end_month = start_month + 2
        if end_month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, end_month + 1, 1)
        end = next_month - timedelta(days=1)
        period_key = f"{today.year}-Q{quarter}"
        return start, end, period_key

    start = date(today.year, today.month, 1)
    next_month = date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
    end = next_month - timedelta(days=1)
    period_key = f"{today.year}-{today.month:02d}"
    return start, end, period_key


def _calculate_category_spend(
    db: Session, uid: str, category: str, start: date, end: date
) -> float:
    start_dt = datetime.combine(start, datetime.min.time(), tzinfo=UTC)
    end_dt = datetime.combine(end, datetime.max.time(), tzinfo=UTC)
    spend = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.amount < 0, -Transaction.amount),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.category == category,
            Transaction.ts >= start_dt,
            Transaction.ts <= end_dt,
        )
        .scalar()
    )
    return float(spend or 0)


def evaluate_budget_thresholds(
    db: Session,
    uid: str,
    *,
    send_notifications: bool = True,
    today: date | None = None,
) -> list[BudgetAlertResult]:
    """Evaluate budgets for the current period and optionally dispatch alerts."""
    budgets = (
        db.query(Budget)
        .filter(Budget.uid == uid, Budget.alert_enabled.is_(True))
        .all()
    )
    if not budgets:
        return []

    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        return []

    now = today or datetime.now(UTC).date()
    notifications = NotificationService(db)
    results: list[BudgetAlertResult] = []

    for budget in budgets:
        if budget.amount <= 0:
            continue

        start, end, period_key = _resolve_period_window(budget.period, now)
        spent = _calculate_category_spend(db, uid, budget.category, start, end)
        threshold_percent = float(budget.alert_threshold_percent or 0)
        threshold_amount = float(budget.amount) * threshold_percent

        if spent < threshold_amount or threshold_amount <= 0:
            continue

        dedupe_key = f"budget_threshold:{budget.id}:{period_key}"
        if send_notifications:
            title = f"{budget.category} budget threshold reached"
            message = (
                f"You've spent ${spent:,.0f} of your ${budget.amount:,.0f} "
                f"{budget.period} budget ({threshold_percent:.0%})."
            )
            notifications.create_notification_for_event(
                user,
                "budget_threshold",
                title,
                message,
                dedupe_key=dedupe_key,
            )

        results.append(
            BudgetAlertResult(
                budget_id=str(budget.id),
                category=budget.category,
                period_key=period_key,
                amount=float(budget.amount),
                spent=spent,
                threshold_amount=threshold_amount,
                threshold_percent=threshold_percent,
            )
        )

    return results
