import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from backend.models import Transaction, get_session
from backend.services.ai import get_ai_client

logger = logging.getLogger(__name__)


async def get_rag_context(user_id: str, query: str) -> str:
    """
    Retrieves relevant transactions for RAG context injection.
    """
    if not query:
        return ""

    try:
        # 1. Embed query
        client = get_ai_client()
        query_embedding = await client.embed_text(query)

        if not query_embedding:
            logger.warning("Failed to generate embedding for query.")
            return ""

        # 2. Search DB
        session_gen = get_session()
        db = next(session_gen)

        try:
            thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

            # PGVector search
            # We assume the embedding column is vector(768)
            stmt = (
                select(Transaction)
                .filter(
                    Transaction.uid == user_id,
                    Transaction.ts >= thirty_days_ago,
                    Transaction.embedding.is_not(None),
                )
                .order_by(Transaction.embedding.cosine_distance(query_embedding))
                .limit(5)
            )

            results = db.execute(stmt).scalars().all()

            if not results:
                return ""

            # 3. Format
            context_lines = []
            for tx in results:
                desc_text = tx.description or tx.merchant_name or "Transaction"
                context_lines.append(
                    f"- {tx.ts.strftime('%Y-%m-%d')}: {desc_text} ({tx.amount} {tx.currency})"
                )

            return "\n".join(context_lines)

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error retrieving RAG context: {e}")
        return ""
