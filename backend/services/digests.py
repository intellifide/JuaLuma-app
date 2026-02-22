"""Core Purpose: Production-ready financial digest scheduling, generation, and delivery."""

# Last Updated: 2026-02-03 00:00 CST

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models import DigestMessage, DigestSettings, Transaction, User
from backend.services.ai import SAFETY_SETTINGS_LOCAL, get_ai_client
from backend.services.email import get_email_client
from backend.utils.encryption import encrypt_prompt

logger = logging.getLogger(__name__)

SUPPORTED_CADENCES = {"weekly", "monthly", "quarterly", "annually"}

def _parse_hhmm(value: str) -> time:
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise ValueError("send_time_local must be in HH:MM format.")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError("send_time_local must be a valid 24h time (HH:MM).")
    return time(hour=hour, minute=minute, second=0)


def _get_user_tz(user: User) -> ZoneInfo:
    try:
        return ZoneInfo(user.time_zone or "UTC")
    except Exception:
        return ZoneInfo("UTC")


def _quarter_start(d: date) -> date:
    q = ((d.month - 1) // 3) * 3 + 1
    return date(d.year, q, 1)


def compute_next_send_at_utc(
    *,
    now_utc: datetime,
    user_tz: ZoneInfo,
    cadence: str,
    send_time_local: time,
    weekly_day_of_week: int,
    day_of_month: int,
) -> datetime:
    """
    Computes the *next* UTC instant to run the digest.

    Deterministic schedule with minimal inputs:
    - weekly: next weekday at HH:MM local (weekday configured by user)
    - monthly: next day-of-month at HH:MM local (1-28)
    - quarterly: first month of next quarter at day-of-month (1-28)
    - annually: January at day-of-month (1-28)
    """
    cadence_norm = cadence.strip().lower()
    if cadence_norm not in SUPPORTED_CADENCES:
        raise ValueError(f"cadence must be one of: {sorted(SUPPORTED_CADENCES)}")

    local_now = now_utc.astimezone(user_tz)
    local_date = local_now.date()

    if cadence_norm == "weekly":
        # Monday == 0 ... Sunday == 6
        if weekly_day_of_week < 0 or weekly_day_of_week > 6:
            raise ValueError("weekly_day_of_week must be between 0 (Mon) and 6 (Sun).")
        days_until_target = (weekly_day_of_week - local_date.weekday()) % 7
        candidate_date = local_date + timedelta(days=days_until_target)
        candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
        if candidate_local <= local_now:
            candidate_local = candidate_local + timedelta(days=7)
        return candidate_local.astimezone(UTC)

    if day_of_month < 1 or day_of_month > 28:
        # Limit to 28 to stay valid across all months without complex clamping rules.
        raise ValueError("day_of_month must be between 1 and 28.")

    if cadence_norm == "monthly":
        candidate_date = date(local_date.year, local_date.month, day_of_month)
        candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
        if candidate_local <= local_now:
            # Next month
            year = local_date.year + (1 if local_date.month == 12 else 0)
            month = 1 if local_date.month == 12 else local_date.month + 1
            candidate_date = date(year, month, day_of_month)
            candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
        return candidate_local.astimezone(UTC)

    if cadence_norm == "quarterly":
        start = _quarter_start(local_date)
        candidate_date = date(start.year, start.month, day_of_month)
        candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
        if candidate_local <= local_now:
            # Next quarter
            month = start.month + 3
            year = start.year + (1 if month > 12 else 0)
            month = month - 12 if month > 12 else month
            candidate_date = date(year, month, day_of_month)
            candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
        return candidate_local.astimezone(UTC)

    # annually
    candidate_date = date(local_date.year, 1, day_of_month)
    candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
    if candidate_local <= local_now:
        candidate_date = date(local_date.year + 1, 1, day_of_month)
        candidate_local = datetime.combine(candidate_date, send_time_local, tzinfo=user_tz)
    return candidate_local.astimezone(UTC)


def _compute_period_key(local_now: datetime, cadence: str) -> str:
    cadence_norm = cadence.strip().lower()
    if cadence_norm == "weekly":
        iso_year, iso_week, _ = local_now.isocalendar()
        return f"w{iso_year}{iso_week:02d}"
    if cadence_norm == "monthly":
        return f"m{local_now.year}{local_now.month:02d}"
    if cadence_norm == "quarterly":
        quarter = ((local_now.month - 1) // 3) + 1
        return f"q{local_now.year}Q{quarter}"
    return f"y{local_now.year}"


def _compute_time_range_utc(*, now_utc: datetime, user_tz: ZoneInfo, cadence: str) -> tuple[datetime, datetime, str]:
    """
    Digest time range is derived from cadence (no separate "timeframe" knob).

    We use rolling windows to keep semantics predictable:
    - weekly: last 7 days
    - monthly: last 30 days
    - quarterly: last 90 days
    - annually: last 365 days
    """
    cadence_norm = cadence.strip().lower()
    if cadence_norm not in SUPPORTED_CADENCES:
        raise ValueError(f"cadence must be one of: {sorted(SUPPORTED_CADENCES)}")

    local_now = now_utc.astimezone(user_tz)
    local_today = local_now.date()
    end_local = datetime.combine(local_today, time(23, 59, 59), tzinfo=user_tz)

    if cadence_norm == "weekly":
        start_local = end_local - timedelta(days=7)
        label = "last 7 days"
    elif cadence_norm == "monthly":
        start_local = end_local - timedelta(days=30)
        label = "last 30 days"
    elif cadence_norm == "quarterly":
        start_local = end_local - timedelta(days=90)
        label = "last 90 days"
    else:
        start_local = end_local - timedelta(days=365)
        label = "last 12 months"

    return start_local.astimezone(UTC), end_local.astimezone(UTC), label


def ensure_digest_settings(db: Session, user: User) -> DigestSettings:
    settings = db.query(DigestSettings).filter(DigestSettings.uid == user.uid).first()
    if settings:
        return settings

    tz = _get_user_tz(user)
    now = datetime.now(UTC)
    next_send = compute_next_send_at_utc(
        now_utc=now,
        user_tz=tz,
        cadence="weekly",
        send_time_local=time(10, 0),
        weekly_day_of_week=0,
        day_of_month=1,
    )

    settings = DigestSettings(
        uid=user.uid,
        enabled=False,
        cadence="weekly",
        weekly_day_of_week=0,
        day_of_month=1,
        send_time_local=time(10, 0),
        delivery_in_app=True,
        delivery_email=True,
        next_send_at_utc=next_send,
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def update_digest_settings(db: Session, user: User, updates: dict) -> DigestSettings:
    settings = ensure_digest_settings(db, user)

    if "cadence" in updates:
        cadence = str(updates["cadence"]).strip().lower()
        if cadence not in SUPPORTED_CADENCES:
            raise HTTPException(
                status_code=400,
                detail=f"cadence must be one of: {sorted(SUPPORTED_CADENCES)}",
            )
        settings.cadence = cadence

    if "weekly_day_of_week" in updates:
        try:
            wday = int(updates["weekly_day_of_week"])
        except Exception as exc:
            raise HTTPException(status_code=400, detail="weekly_day_of_week must be an integer 0-6.") from exc
        if wday < 0 or wday > 6:
            raise HTTPException(status_code=400, detail="weekly_day_of_week must be between 0 (Mon) and 6 (Sun).")
        settings.weekly_day_of_week = wday

    if "day_of_month" in updates:
        try:
            dom = int(updates["day_of_month"])
        except Exception as exc:
            raise HTTPException(status_code=400, detail="day_of_month must be an integer 1-28.") from exc
        if dom < 1 or dom > 28:
            raise HTTPException(status_code=400, detail="day_of_month must be between 1 and 28.")
        settings.day_of_month = dom

    if "send_time_local" in updates:
        try:
            settings.send_time_local = _parse_hhmm(str(updates["send_time_local"]))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if "enabled" in updates:
        settings.enabled = bool(updates["enabled"])

    if "delivery_in_app" in updates:
        settings.delivery_in_app = bool(updates["delivery_in_app"])

    if "delivery_email" in updates:
        settings.delivery_email = bool(updates["delivery_email"])

    # Always recompute next send based on current user timezone + settings.
    tz = _get_user_tz(user)
    now = datetime.now(UTC)
    settings.next_send_at_utc = compute_next_send_at_utc(
        now_utc=now,
        user_tz=tz,
        cadence=settings.cadence,
        send_time_local=settings.send_time_local,
        weekly_day_of_week=settings.weekly_day_of_week,
        day_of_month=settings.day_of_month,
    )

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def _build_snapshot(db: Session, uid: str, start_utc: datetime, end_utc: datetime) -> dict[str, object]:
    base = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start_utc,
            Transaction.ts <= end_utc,
        )
    )

    # income: amount > 0, spend: amount < 0
    income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start_utc,
            Transaction.ts <= end_utc,
            Transaction.amount > 0,
        )
        .scalar()
        or 0
    )
    spend = (
        db.query(func.coalesce(func.sum(-Transaction.amount), 0))
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start_utc,
            Transaction.ts <= end_utc,
            Transaction.amount < 0,
        )
        .scalar()
        or 0
    )

    top_categories = (
        db.query(
            func.coalesce(Transaction.category, "Uncategorized"),
            func.coalesce(func.sum(-Transaction.amount), 0),
        )
        .filter(
            Transaction.uid == uid,
            Transaction.archived.is_(False),
            Transaction.ts >= start_utc,
            Transaction.ts <= end_utc,
            Transaction.amount < 0,
        )
        .group_by(func.coalesce(Transaction.category, "Uncategorized"))
        .order_by(func.sum(-Transaction.amount).desc())
        .limit(8)
        .all()
    )

    return {
        "income": float(income),
        "spend": float(spend),
        "net": float(Decimal(income) - Decimal(spend)),
        "top_categories": [
            {"category": cat, "amount": float(amount)} for cat, amount in top_categories
        ],
        "txn_count": base.count(),
    }


def _default_digest_prompt(*, timeframe_label: str, snapshot: dict[str, object]) -> str:
    top_lines = ""
    for item in snapshot.get("top_categories", [])[:6]:  # type: ignore[index]
        top_lines += f"- {item['category']}: ${item['amount']:.2f}\n"

    return (
        "You are JuaLuma's financial assistant.\n"
        "Generate a holistic, actionable financial digest for the user.\n"
        "Constraints:\n"
        "- Be concise but useful.\n"
        "- Use bullet points and short sections.\n"
        "- Do NOT include account numbers.\n"
        "- If information is missing, say so explicitly and suggest next steps.\n\n"
        f"Timeframe: {timeframe_label}\n\n"
        "Snapshot (computed from transactions):\n"
        f"- Income: ${snapshot.get('income', 0):.2f}\n"
        f"- Spending: ${snapshot.get('spend', 0):.2f}\n"
        f"- Net: ${snapshot.get('net', 0):.2f}\n"
        f"- Transactions counted: {snapshot.get('txn_count', 0)}\n\n"
        "Top spending categories:\n"
        f"{top_lines if top_lines else '(none)'}\n"
        "Now write the digest.\n"
    )


def run_due_digests(db: Session, *, now_utc: datetime | None = None) -> int:
    now = now_utc or datetime.now(UTC)

    # Lock due rows to make the runner safe under parallel schedulers.
    due = (
        db.query(DigestSettings)
        .filter(
            DigestSettings.enabled.is_(True),
            DigestSettings.next_send_at_utc.isnot(None),
            DigestSettings.next_send_at_utc <= now,
        )
        .with_for_update(skip_locked=True)
        .all()
    )

    sent = 0
    for settings in due:
        try:
            if _run_single_digest(db, settings.uid, now_utc=now) > 0:
                sent += 1
        except Exception:
            logger.exception("Digest runner failed for uid=%s", settings.uid)
            # Best-effort: move schedule forward to avoid tight retry loops.
            user = db.query(User).filter(User.uid == settings.uid).first()
            tz = _get_user_tz(user) if user else ZoneInfo("UTC")
            settings.next_send_at_utc = compute_next_send_at_utc(
                now_utc=now + timedelta(minutes=10),
                user_tz=tz,
                cadence=settings.cadence,
                send_time_local=settings.send_time_local,
                weekly_day_of_week=getattr(settings, "weekly_day_of_week", 0),
                day_of_month=getattr(settings, "day_of_month", 1),
            )
            db.add(settings)

    db.commit()
    return sent


def _run_single_digest(db: Session, uid: str, *, now_utc: datetime) -> int:
    """
    Generate + persist a digest if we haven't already sent one for the current cadence period.
    Returns 1 if sent, 0 if skipped.
    """
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        return 0

    settings = ensure_digest_settings(db, user)
    if not settings.enabled:
        return 0

    tz = _get_user_tz(user)
    local_now = now_utc.astimezone(tz)
    period_key = _compute_period_key(local_now, settings.cadence)

    if settings.last_period_key == period_key:
        # Already ran for this period; just schedule forward.
        settings.next_send_at_utc = compute_next_send_at_utc(
            now_utc=now_utc + timedelta(seconds=1),
            user_tz=tz,
            cadence=settings.cadence,
            send_time_local=settings.send_time_local,
            weekly_day_of_week=settings.weekly_day_of_week,
            day_of_month=settings.day_of_month,
        )
        db.add(settings)
        return 0

    start_utc, end_utc, tf_label = _compute_time_range_utc(
        now_utc=now_utc,
        user_tz=tz,
        cadence=settings.cadence,
    )
    snapshot = _build_snapshot(db, uid, start_utc, end_utc)
    prompt = _default_digest_prompt(timeframe_label=tf_label, snapshot=snapshot)

    client = get_ai_client()
    # The AIClient wrapper is async; schedule runner is sync. Run in a small event loop.
    import asyncio

    response_obj = asyncio.run(
        client.generate_content(
            prompt,
            safety_settings=SAFETY_SETTINGS_LOCAL if client.client_type == "local" else None,
        )
    )

    response_text = ""
    if getattr(response_obj, "candidates", None):
        try:
            response_text = response_obj.text
        except Exception:
            parts = [part.text for part in response_obj.candidates[0].content.parts]
            response_text = "".join(parts)

    encrypted_prompt = encrypt_prompt(prompt, user_dek_ref=uid).encode("utf-8")
    encrypted_response = encrypt_prompt(response_text, user_dek_ref=uid).encode("utf-8")

    message = DigestMessage(
        uid=uid,
        thread_id=settings.thread_id,
        period_key=period_key,
        model="gemini",
        tokens=0,
        user_dek_ref=uid,
        encrypted_prompt=encrypted_prompt,
        encrypted_response=encrypted_response,
    )
    db.add(message)

    if settings.delivery_email and user.email:
        subject = "Your JuaLuma financial digest"
        get_email_client().send_financial_digest(user.email, subject, response_text)

    settings.last_period_key = period_key
    settings.last_sent_at_utc = now_utc
    settings.next_send_at_utc = compute_next_send_at_utc(
        now_utc=now_utc + timedelta(seconds=1),
        user_tz=tz,
        cadence=settings.cadence,
        send_time_local=settings.send_time_local,
        weekly_day_of_week=settings.weekly_day_of_week,
        day_of_month=settings.day_of_month,
    )
    db.add(settings)
    return 1


def run_digest_now(db: Session, uid: str, *, now_utc: datetime | None = None) -> int:
    """Developer helper to generate a digest immediately (still idempotent per period)."""
    sent = _run_single_digest(db, uid, now_utc=now_utc or datetime.now(UTC))
    # _run_single_digest intentionally doesn't commit so batch runners can control transactions.
    # For dev run-now, we want an immediate durable write.
    db.commit()
    return sent


def list_digest_threads(db: Session, uid: str) -> list[dict[str, str]]:
    settings = db.query(DigestSettings).filter(DigestSettings.uid == uid).first()
    if not settings:
        return []

    latest = (
        db.query(DigestMessage)
        .filter(DigestMessage.uid == uid, DigestMessage.thread_id == settings.thread_id)
        .order_by(DigestMessage.created_at.desc())
        .first()
    )
    if not latest:
        return []

    # Keep preview minimal (first ~140 chars of assistant response).
    from backend.utils.encryption import decrypt_prompt

    preview_text = decrypt_prompt(latest.encrypted_response, user_dek_ref=latest.user_dek_ref)
    preview = preview_text.strip().replace("\n", " ")
    if len(preview) > 140:
        preview = preview[:137] + "..."

    return [
        {
            "thread_id": str(settings.thread_id),
            "title": "Financial Digest",
            "preview": preview,
            "timestamp": latest.created_at.isoformat(),
        }
    ]


def load_digest_thread_messages(db: Session, uid: str, thread_id: str) -> dict[str, object]:
    settings = db.query(DigestSettings).filter(DigestSettings.uid == uid).first()
    if not settings or str(settings.thread_id) != thread_id:
        raise HTTPException(status_code=404, detail="Digest thread not found.")

    messages = (
        db.query(DigestMessage)
        .filter(DigestMessage.uid == uid, DigestMessage.thread_id == settings.thread_id)
        .order_by(DigestMessage.created_at.asc())
        .all()
    )

    chat_messages: list[dict[str, str]] = []
    for item in messages:
        chat_messages.extend(item.to_chat_messages())

    return {
        "thread_id": str(settings.thread_id),
        "title": "Financial Digest",
        "messages": chat_messages,
    }
