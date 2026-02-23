# Financial Context Retrieval Service
# Created: 2026-02-14 — Stage 2: AI Features Development
"""
Retrieves and formats financial context for RAG-augmented AI responses.
Uses pgvector cosine similarity search with Cloud SQL embedding() function,
enforces RLS for user-data isolation, and formats structured context for prompts.
"""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import (
    Account,
    ManualAsset,
    Subscription,
    SupportTicket,
    Transaction,
    UserDocument,
    get_session,
)
from backend.utils.rls import set_db_user_context

logger = logging.getLogger(__name__)

TEXT_PARSABLE_FILE_TYPES = {"txt", "md", "csv", "json", "xml", "rtf"}
UPLOAD_CONTEXT_MAX_DOCS = 5
UPLOAD_CONTEXT_MAX_CHARS_PER_DOC = 1800


async def get_financial_context(
    user_id: str,
    query: str,
    db: Session | None = None,
    top_k: int = 5,
    days: int = 30,
) -> str:
    """
    Retrieves relevant financial context for AI prompt injection.
    Combines vector similarity search with spending summary for richer context.

    Args:
        user_id: Unified User ID for RLS enforcement.
        query: User's natural language query.
        db: Optional SQLAlchemy session (creates one if None).
        top_k: Number of similar transactions to retrieve.
        days: Lookback window in days.

    Returns:
        Formatted context string for prompt injection, or empty string on failure.
    """
    if not query:
        return ""

    local_session = False
    try:
        if db is None:
            session_gen = get_session()
            db = next(session_gen)
            local_session = True

        # Enforce RLS
        set_db_user_context(db, user_id)

        cutoff = datetime.now(UTC) - timedelta(days=days)

        # 1. Vector similarity search — server-side embedding via Cloud SQL
        similar_txns = _vector_search(db, user_id, query, cutoff, top_k)

        # 2. Spending summary by category
        spending_summary = _spending_summary(db, user_id, cutoff)

        # 3. Account + net worth + subscription + support context
        account_summary = _account_summary(db, user_id)
        support_summary = _support_summary(db, user_id)
        subscription_summary = _subscription_summary(db, user_id)
        uploaded_file_context, upload_audit = _uploaded_documents_context(db, user_id)

        # 4. Format combined context
        context_str = _format_context(
            transactions=similar_txns,
            spending_summary=spending_summary,
            account_summary=account_summary,
            support_summary=support_summary,
            subscription_summary=subscription_summary,
            uploaded_file_context=uploaded_file_context,
        )
        logger.info(
            "AI_UPLOAD_CONTEXT_ASSEMBLY uid=%s docs_considered=%s docs_included=%s skip_reasons=%s",
            user_id,
            upload_audit["considered"],
            upload_audit["included"],
            upload_audit["skip_reasons"],
        )
        return context_str

    except Exception as e:
        logger.error(f"Financial context retrieval failed: {e}", exc_info=True)
        if db is not None:
            try:
                db.rollback()
            except Exception:
                pass
        return ""
    finally:
        if local_session and db is not None:
            db.close()


def _vector_search(
    db: Session,
    user_id: str,
    query: str,
    cutoff: datetime,
    top_k: int,
) -> list[Transaction]:
    """
    Performs pgvector cosine similarity search using Cloud SQL's
    embedding() function for server-side query embedding.
    """
    try:
        stmt = (
            select(Transaction)
            .filter(
                Transaction.uid == user_id,
                Transaction.ts >= cutoff,
                Transaction.embedding.is_not(None),
                Transaction.archived.is_(False),
            )
            .order_by(
                Transaction.embedding.cosine_distance(
                    func.embedding("text-embedding-004", query)
                )
            )
            .limit(top_k)
        )
        return list(db.execute(stmt).scalars().all())
    except Exception as e:
        logger.warning(f"Vector search failed, falling back to recency: {e}")
        db.rollback()
        # Fallback: return most recent transactions
        fallback_stmt = (
            select(Transaction)
            .filter(
                Transaction.uid == user_id,
                Transaction.ts >= cutoff,
                Transaction.archived.is_(False),
            )
            .order_by(Transaction.ts.desc())
            .limit(top_k)
        )
        return list(db.execute(fallback_stmt).scalars().all())


def _spending_summary(
    db: Session,
    user_id: str,
    cutoff: datetime,
) -> list[dict[str, Any]]:
    """
    Aggregates spending by category for the lookback window.
    Returns list of {category, total, count} dicts, sorted by total descending.
    """
    try:
        stmt = (
            select(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count().label("count"),
            )
            .filter(
                Transaction.uid == user_id,
                Transaction.ts >= cutoff,
                Transaction.archived.is_(False),
                Transaction.amount < 0,  # Expenses only (negative amounts)
            )
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).asc())  # Largest spend first
        )
        rows = db.execute(stmt).all()
        return [
            {
                "category": row.category or "Uncategorized",
                "total": float(abs(row.total)),
                "count": row.count,
            }
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"Spending summary failed: {e}")
        return []


def _format_context(
    transactions: list[Transaction],
    spending_summary: list[dict[str, Any]],
    account_summary: dict[str, Any] | None = None,
    support_summary: dict[str, Any] | None = None,
    subscription_summary: dict[str, Any] | None = None,
    uploaded_file_context: str | None = None,
) -> str:
    """
    Formats transaction search results and spending summary into
    structured context for AI prompt injection.
    """
    sections: list[str] = []

    if account_summary:
        lines = ["## Account Overview"]
        lines.append(
            "Net Worth (current snapshot): "
            f"${account_summary.get('net_worth', 0.0):,.2f}"
        )
        lines.append(
            f"Connected Accounts: {account_summary.get('connected_accounts', 0)} | "
            f"Manual Assets/Liabilities: {account_summary.get('manual_assets', 0)}"
        )
        by_type = account_summary.get("accounts_by_type", {})
        if by_type:
            breakdown = ", ".join(f"{k}: {v}" for k, v in by_type.items())
            lines.append(f"Account Types: {breakdown}")
        sections.append("\n".join(lines))

    if subscription_summary:
        lines = ["## Subscription"]
        lines.append(
            f"Plan: {subscription_summary.get('plan', 'free')} | "
            f"Status: {subscription_summary.get('status', 'unknown')}"
        )
        renew_at = subscription_summary.get("renew_at")
        if renew_at:
            lines.append(f"Renews At: {renew_at}")
        sections.append("\n".join(lines))

    if support_summary:
        lines = ["## Support Summary"]
        lines.append(
            f"Open/Queued Tickets: {support_summary.get('open_count', 0)}"
        )
        recent_subjects = support_summary.get("recent_subjects", [])
        if recent_subjects:
            lines.append("Recent Ticket Subjects:")
            for subject in recent_subjects[:3]:
                lines.append(f"- {subject}")
        sections.append("\n".join(lines))

    # Spending summary section
    if spending_summary:
        lines = ["## Spending Summary (Last 30 Days)"]
        total_spend = sum(item["total"] for item in spending_summary)
        lines.append(f"Total Spending: ${total_spend:,.2f}")
        lines.append("")
        for item in spending_summary[:10]:  # Top 10 categories
            lines.append(
                f"- {item['category']}: ${item['total']:,.2f} ({item['count']} transactions)"
            )
        sections.append("\n".join(lines))

    # Relevant transactions section
    if transactions:
        lines = ["## Relevant Transactions"]
        for tx in transactions:
            desc_text = tx.description or tx.merchant_name or "Transaction"
            merchant = f" at {tx.merchant_name}" if tx.merchant_name and tx.merchant_name != desc_text else ""
            category = f" [{tx.category}]" if tx.category else ""
            lines.append(
                f"- {tx.ts.strftime('%Y-%m-%d')}: {desc_text}{merchant}{category} "
                f"(${abs(float(tx.amount)):,.2f} {tx.currency})"
            )
        sections.append("\n".join(lines))

    if uploaded_file_context:
        sections.append(uploaded_file_context)

    return "\n\n".join(sections)


def _uploaded_documents_context(
    db: Session,
    user_id: str,
    max_docs: int = UPLOAD_CONTEXT_MAX_DOCS,
    max_chars_per_doc: int = UPLOAD_CONTEXT_MAX_CHARS_PER_DOC,
) -> tuple[str, dict[str, Any]]:
    docs = (
        db.query(UserDocument)
        .filter(UserDocument.uid == user_id)
        .order_by(UserDocument.created_at.desc())
        .limit(max_docs)
        .all()
    )

    lines: list[str] = []
    skip_reasons: dict[str, int] = {}

    for doc in docs:
        excerpt, skip_reason = _document_excerpt_for_context(doc, max_chars_per_doc)
        if skip_reason:
            skip_reasons[skip_reason] = skip_reasons.get(skip_reason, 0) + 1
            continue
        if excerpt:
            lines.append(f"- {doc.name} ({doc.file_type}): {excerpt}")

    if not lines:
        return "", {
            "considered": len(docs),
            "included": 0,
            "skip_reasons": skip_reasons,
        }

    section = "## Uploaded File Context\n" + "\n".join(lines)
    return section, {
        "considered": len(docs),
        "included": len(lines),
        "skip_reasons": skip_reasons,
    }


def _document_excerpt_for_context(
    doc: UserDocument, max_chars: int
) -> tuple[str | None, str | None]:
    file_type = (doc.file_type or "").lower()
    if file_type not in TEXT_PARSABLE_FILE_TYPES:
        return None, "DOC_UNPARSEABLE_TYPE"

    path = Path(doc.file_path)
    if not path.exists():
        return None, "DOC_FILE_MISSING"

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None, "DOC_READ_ERROR"

    normalized = " ".join(content.split())
    if not normalized:
        return None, "DOC_EMPTY_CONTENT"

    return normalized[:max_chars], None


def _account_summary(db: Session, user_id: str) -> dict[str, Any]:
    accounts = (
        db.query(Account)
        .filter(Account.uid == user_id)
        .all()
    )
    manual_assets = (
        db.query(ManualAsset)
        .filter(ManualAsset.uid == user_id)
        .all()
    )

    net_worth = Decimal("0")
    by_type: dict[str, int] = {}
    for account in accounts:
        account_type = account.account_type or "unknown"
        by_type[account_type] = by_type.get(account_type, 0) + 1
        amount = Decimal(str(account.balance or 0))
        if (account.balance_type or "asset").lower() == "liability":
            net_worth -= amount
        else:
            net_worth += amount

    for item in manual_assets:
        value = Decimal(str(item.value or 0))
        if (item.balance_type or "asset").lower() == "liability":
            net_worth -= value
        else:
            net_worth += value

    return {
        "net_worth": float(net_worth),
        "connected_accounts": len(accounts),
        "manual_assets": len(manual_assets),
        "accounts_by_type": by_type,
    }


def _support_summary(db: Session, user_id: str) -> dict[str, Any]:
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == user_id)
        .order_by(SupportTicket.created_at.desc())
        .limit(5)
        .all()
    )
    open_count = sum(1 for t in tickets if (t.status or "").lower() in {"open", "queued", "in_progress"})
    return {
        "open_count": open_count,
        "recent_subjects": [t.subject for t in tickets if t.subject],
    }


def _subscription_summary(db: Session, user_id: str) -> dict[str, Any]:
    sub = (
        db.query(Subscription)
        .filter(Subscription.uid == user_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        return {"plan": "free", "status": "active"}
    return {
        "plan": sub.plan,
        "status": sub.status or "active",
        "renew_at": sub.renew_at.isoformat() if sub.renew_at else None,
    }
