"""Plaid webhook ingestion endpoint."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import PlaidWebhookEvent
from backend.services.plaid_sync import mark_plaid_item_sync_needed
from backend.services.plaid_webhooks import (
    build_plaid_webhook_dedupe_key,
    parse_plaid_webhook_payload,
    verify_plaid_webhook_signature,
)
from backend.utils import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/webhook/plaid", include_in_schema=False)
async def plaid_webhook(
    request: Request,
    db: Session = Depends(get_db),
    plaid_verification: str | None = Header(default=None, alias="Plaid-Verification"),
    plaid_signature: str | None = Header(default=None, alias="Plaid-Signature"),
):
    payload_raw = await request.body()
    payload_json = parse_plaid_webhook_payload(payload_raw)
    signature_verified = verify_plaid_webhook_signature(
        payload_raw,
        plaid_verification=plaid_verification,
        plaid_signature=plaid_signature,
    )

    dedupe_key = build_plaid_webhook_dedupe_key(payload_json, payload_raw)
    item_id = str(payload_json.get("item_id") or "").strip() or None

    event = PlaidWebhookEvent(
        item_id=item_id,
        webhook_type=str(payload_json.get("webhook_type") or "") or None,
        webhook_code=str(payload_json.get("webhook_code") or "") or None,
        dedupe_key=dedupe_key,
        signature_verified=signature_verified,
        payload_json=payload_json,
        received_at=datetime.now(UTC),
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info("Ignoring duplicate Plaid webhook event with key %s", dedupe_key)
        return {"status": "duplicate"}

    if item_id:
        mark_plaid_item_sync_needed(db, item_id=item_id, webhook_received_at=event.received_at)

    return {"status": "accepted"}


__all__ = ["router"]
