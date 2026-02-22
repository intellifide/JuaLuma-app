# Last Modified: 2026-01-18 03:16 CST
"""
Archive Essential tier ledger rows older than one full year, then prune hot storage.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from typing import Any

from google.cloud import storage

from backend.models import LedgerHotEssential, SessionLocal

logger = logging.getLogger(__name__)


def _one_year_ago(now: datetime) -> datetime:
    """Return the same calendar day/time one year earlier, handling leap years."""
    try:
        return now.replace(year=now.year - 1)
    except ValueError:
        return now.replace(year=now.year - 1, day=28)


def _archive_prefix(row: LedgerHotEssential) -> str:
    ts = row.ts
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    else:
        ts = ts.astimezone(UTC)
    return f"essential/{row.uid}/{ts.year}/{ts.month:02d}"


def _serialize_row(row: LedgerHotEssential) -> str:
    payload: dict[str, Any] = {
        "id": str(row.id),
        "uid": row.uid,
        "account_id": str(row.account_id),
        "ts": row.ts.isoformat(),
        "amount": str(row.amount),
        "currency": row.currency,
        "category": row.category,
        "raw_json": row.raw_json,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    return json.dumps(payload, separators=(",", ":")) + "\n"


def _upload_partition(
    bucket: storage.Bucket,
    prefix: str,
    run_id: str,
    part_index: int,
    rows: list[str],
) -> None:
    blob_name = f"{prefix}/ledger_hot_essential_{run_id}_part{part_index:05d}.jsonl"
    bucket.blob(blob_name).upload_from_string(
        "".join(rows), content_type="application/jsonl"
    )


def archive_essential_ledger(batch_size: int = 1000) -> int:
    bucket_name = os.getenv("LEDGER_ARCHIVE_BUCKET", "jualuma-ledger-archive")
    session = SessionLocal()
    now = datetime.now(UTC)
    cutoff = _one_year_ago(now)
    run_id = now.strftime("%Y%m%d%H%M%S")

    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)

        query = (
            session.query(LedgerHotEssential)
            .filter(LedgerHotEssential.ts < cutoff)
            .order_by(LedgerHotEssential.uid, LedgerHotEssential.ts)
        )

        current_prefix: str | None = None
        part_index = 0
        buffer: list[str] = []
        archived_rows = 0

        for row in query.yield_per(batch_size):
            prefix = _archive_prefix(row)
            if current_prefix and prefix != current_prefix:
                if buffer:
                    part_index += 1
                    _upload_partition(
                        bucket, current_prefix, run_id, part_index, buffer
                    )
                buffer = []
                part_index = 0

            current_prefix = prefix
            buffer.append(_serialize_row(row))
            archived_rows += 1

            if len(buffer) >= batch_size:
                part_index += 1
                _upload_partition(bucket, current_prefix, run_id, part_index, buffer)
                buffer = []

        if buffer and current_prefix:
            part_index += 1
            _upload_partition(bucket, current_prefix, run_id, part_index, buffer)

        if archived_rows == 0:
            logger.info("No Essential ledger rows older than %s to archive.", cutoff)
            return 0

        deleted_rows = (
            session.query(LedgerHotEssential)
            .filter(LedgerHotEssential.ts < cutoff)
            .delete(synchronize_session=False)
        )
        session.commit()

        logger.info(
            "Archived %d Essential ledger rows and pruned %d rows older than %s.",
            archived_rows,
            deleted_rows,
            cutoff,
        )
        return deleted_rows
    except Exception:
        session.rollback()
        logger.exception("Essential ledger archiver failed.")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    archive_essential_ledger()
