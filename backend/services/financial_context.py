# Financial Context Retrieval Service
# Created: 2026-02-14 — Stage 2: AI Features Development
"""
Retrieves and formats financial context for RAG-augmented AI responses.
Uses pgvector cosine similarity search with Cloud SQL embedding() function,
enforces RLS for user-data isolation, and formats structured context for prompts.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Transaction, get_session
from backend.utils.rls import set_db_user_context

logger = logging.getLogger(__name__)


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

        # 3. Format combined context
        return _format_context(similar_txns, spending_summary)

    except Exception as e:
        logger.error(f"Financial context retrieval failed: {e}", exc_info=True)
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
) -> str:
    """
    Formats transaction search results and spending summary into
    structured context for AI prompt injection.
    """
    sections: list[str] = []

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

    return "\n\n".join(sections)
