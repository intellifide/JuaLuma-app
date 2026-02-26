# Last Modified: 2026-01-23 21:46 CST
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.core import settings
from backend.middleware.auth import get_current_user
from backend.models import LLMLog, Subscription, User
from backend.services.ai import (
    TIER_LIMITS,
    check_rate_limit,
    generate_chat_response,
    generate_chat_response_stream,
    get_quota_snapshot_sync,
)
from backend.services.financial_context import (
    get_financial_context,
    get_uploaded_documents_context,
)
from backend.utils import get_db

# Import encryption utils (TIER 3.4)
# Assuming backend/utils/encryption.py exists
from backend.utils.encryption import decrypt_prompt, encrypt_prompt

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)


def _active_model_name() -> str:
    return settings.ai_model_prod or settings.ai_model


class ChatRequest(BaseModel):
    message: str = Field(example="Give me a spending summary for this week.")
    client_context: dict[str, Any] | None = Field(
        default=None, description="Optional frontend page/view context."
    )
    attachment_ids: list[str] | None = Field(
        default=None,
        description=(
            "Optional uploaded document IDs selected in the composer. "
            "When provided, context assembly prioritizes these uploads."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"message": "How much did I spend on dining last month?"}]
        }
    )


class ChatResponse(BaseModel):
    response: str
    tokens: int = 0
    quota_remaining: int | None = None
    quota_limit: int | None = None
    quota_used: int | None = None
    effective_model: str | None = None
    fallback_applied: bool = False
    fallback_reason: str | None = None
    fallback_message: str | None = None
    web_search_used: bool = False
    citations: list[dict[str, str]] = Field(default_factory=list)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "response": "You spent $320 on dining and $120 on transport.",
                    "tokens": 850,
                    "quota_remaining": 12,
                }
            ]
        }
    )


class HistoryItem(BaseModel):
    prompt: str
    response: str
    timestamp: str

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "prompt": "Summarize my expenses",
                    "response": "You spent $1,240 last month.",
                    "timestamp": "2025-12-08T12:00:00Z",
                }
            ]
        }
    )


class HistoryResponse(BaseModel):
    messages: list[HistoryItem]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "messages": [
                        {
                            "prompt": "How is my budget?",
                            "response": "You are under budget by $200.",
                            "timestamp": "2025-12-07T10:00:00Z",
                        }
                    ]
                }
            ]
        }
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a chat message from the user.

    - **message**: The user's input prompt.

    Checks rate limits based on user tier, retrieves RAG context (if non-free),
    generates response via Gemini, logs encrypted interaction, and returns response.
    """
    user_id = current_user.uid
    message = payload.message.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Please enter a message for the AI assistant.")

    # 1. Get User Subscription/Tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"

    # 2. Check rate limit before doing extra work (RAG/model)
    precheck = await check_rate_limit(user_id)
    if isinstance(precheck, tuple):
        prechecked_limit = precheck
        tier = prechecked_limit[0]
    else:
        limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        prechecked_limit = (tier, limit, int(precheck) if precheck is not None else 0)

    # 3. Context Assembly
    context = ""
    if tier not in ["free"]:
        try:
            context = await get_financial_context(
                user_id,
                message,
                db=db,
                attachment_ids=payload.attachment_ids,
            )
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")
            # Continue without context
    else:
        try:
            context = await get_uploaded_documents_context(
                user_id,
                db=db,
                attachment_ids=payload.attachment_ids,
            )
        except Exception as e:
            logger.warning(f"Upload context retrieval failed for free tier: {e}")

    # 4. Generate Response (TIER 3.2/3.6)
    # Pass prechecked_limit to avoid duplicate lookups in generate_chat_response.
    # Determine if we should use caching (e.g. if context is significant)
    # Vertex AI Caching minimum is 32k tokens for context caching to be valid/useful usually,
    # but for this implementation we follow the directive to enable it.
    # We set a lower threshold for demonstration/testing.
    use_cache = bool(context and len(context) > 5000)

    result = await generate_chat_response(
        prompt=message,
        context=context,
        user_id=user_id,
        prechecked_limit=prechecked_limit,
        use_cache=use_cache,
        client_context=payload.client_context,
    )
    ai_response = result.get("response", "")
    usage_today = result.get("usage_today")
    effective_model = result.get("effective_model") or _active_model_name()
    fallback_applied = bool(result.get("fallback_applied"))
    fallback_reason = result.get("fallback_reason")
    fallback_message = result.get("fallback_message")
    # Compute quota remaining using the same limit used for the rate check
    # Fall back gracefully if the generator did not return usage info
    if usage_today is not None:
        _, limit_from_precheck, _ = prechecked_limit
        quota_remaining = max(limit_from_precheck - usage_today, 0)
        quota_limit = limit_from_precheck
        quota_used = usage_today
    else:
        quota_remaining = None
        quota_limit = None
        quota_used = None

    # 5. Log to Audit (LLMLog) - skip for free tier to keep sessions ephemeral
    if tier != "free":
        # TIER 3.4: Encryption
        # Encrypt response as well (since model requires encrypted_response)
        # 2025-12-10 16:46 CST - store ciphertext as bytes to satisfy BYTEA columns
        encrypted_prompt = encrypt_prompt(message, user_dek_ref=user_id).encode(
            "utf-8"
        )
        encrypted_response = encrypt_prompt(ai_response, user_dek_ref=user_id).encode(
            "utf-8"
        )

        log_entry = LLMLog(
            uid=user_id,
            model=effective_model,
            encrypted_prompt=encrypted_prompt,
            encrypted_response=encrypted_response,
            # context_used not in model
            tokens=0,  # tokens_used -> tokens
            user_dek_ref=user_id,
            archived=False,
        )
        db.add(log_entry)
        db.commit()

    return ChatResponse(
        response=ai_response,
        tokens=0,  # Placeholder
        quota_remaining=quota_remaining,
        quota_limit=quota_limit,
        quota_used=quota_used,
        effective_model=effective_model,
        fallback_applied=fallback_applied,
        fallback_reason=fallback_reason,
        fallback_message=fallback_message,
        web_search_used=bool(result.get("web_search_used")),
        citations=result.get("citations") or [],
    )


@router.post("/chat/stream")
async def chat_stream_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream AI response chunks as server-sent events."""
    user_id = current_user.uid
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Please enter a message for the AI assistant.")

    # 1. Get User Subscription/Tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"

    # 2. Check rate limit before doing extra work (RAG/model)
    precheck = await check_rate_limit(user_id)
    if isinstance(precheck, tuple):
        prechecked_limit = precheck
        tier = prechecked_limit[0]
    else:
        limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        prechecked_limit = (tier, limit, int(precheck) if precheck is not None else 0)

    # 3. Context Assembly
    context = ""
    if tier not in ["free"]:
        try:
            context = await get_financial_context(
                user_id,
                message,
                db=db,
                attachment_ids=payload.attachment_ids,
            )
        except Exception as e:
            logger.warning(f"RAG context retrieval failed during stream: {e}")
    else:
        try:
            context = await get_uploaded_documents_context(
                user_id,
                db=db,
                attachment_ids=payload.attachment_ids,
            )
        except Exception as e:
            logger.warning(f"Upload context retrieval failed for free tier stream: {e}")

    async def event_stream():
        final_response = ""
        quota_limit = prechecked_limit[1]
        quota_used: int | None = None
        quota_remaining: int | None = None
        effective_tier = tier
        citations: list[dict[str, str]] = []
        web_search_used = False
        effective_model: str | None = None
        fallback_applied = False
        fallback_reason: str | None = None
        fallback_message: str | None = None

        try:
            async for event in generate_chat_response_stream(
                prompt=message,
                context=context,
                user_id=user_id,
                prechecked_limit=prechecked_limit,
                client_context=payload.client_context,
            ):
                if event.get("type") == "chunk":
                    delta = str(event.get("delta") or "")
                    if delta:
                        final_response += delta
                        yield f"data: {json.dumps({'type': 'chunk', 'delta': delta})}\n\n"
                    continue

                if event.get("type") == "web_search":
                    status = str(event.get("status") or "completed")
                    results_count = int(event.get("results_count") or 0)
                    payload_meta = {
                        "type": "web_search",
                        "status": status,
                        "results_count": results_count,
                    }
                    yield f"data: {json.dumps(payload_meta)}\n\n"
                    continue

                if event.get("type") == "complete":
                    final_response = str(event.get("response") or final_response)
                    effective_tier = str(event.get("tier") or effective_tier)
                    quota_used = int(event.get("usage_today") or 0)
                    quota_limit = int(event.get("limit") or quota_limit)
                    quota_remaining = max(quota_limit - quota_used, 0)
                    citations = event.get("citations") or []
                    web_search_used = bool(event.get("web_search_used"))
                    effective_model = str(event.get("effective_model") or "") or _active_model_name()
                    fallback_applied = bool(event.get("fallback_applied"))
                    fallback_reason = event.get("fallback_reason")
                    fallback_message = event.get("fallback_message")

            # 4. Log to Audit (LLMLog) - skip for free tier to keep sessions ephemeral
            if effective_tier != "free" and final_response:
                encrypted_prompt = encrypt_prompt(message, user_dek_ref=user_id).encode("utf-8")
                encrypted_response = encrypt_prompt(final_response, user_dek_ref=user_id).encode("utf-8")

                log_entry = LLMLog(
                    uid=user_id,
                    model=effective_model or _active_model_name(),
                    encrypted_prompt=encrypted_prompt,
                    encrypted_response=encrypted_response,
                    tokens=0,
                    user_dek_ref=user_id,
                    archived=False,
                )
                db.add(log_entry)
                db.commit()

            payload_complete = {
                "type": "complete",
                "response": final_response,
                "tokens": 0,
                "quota_remaining": quota_remaining,
                "quota_limit": quota_limit,
                "quota_used": quota_used,
                "effective_model": effective_model or _active_model_name(),
                "fallback_applied": fallback_applied,
                "fallback_reason": fallback_reason,
                "fallback_message": fallback_message,
                "web_search_used": web_search_used,
                "citations": citations,
            }
            yield f"data: {json.dumps(payload_complete)}\n\n"
        except HTTPException as exc:
            db.rollback()
            err = {"type": "error", "error": str(exc.detail)}
            yield f"data: {json.dumps(err)}\n\n"
        except Exception as exc:
            db.rollback()
            logger.error("Streaming chat failed: %s", exc, exc_info=True)
            err = {"type": "error", "error": "We encountered an issue while streaming your AI response."}
            yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history", response_model=HistoryResponse)
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve chat history.

    Returns the 10 most recent encrypted chat logs, decrypted for display.
    Free tier limited to 10 items.
    """
    user_id = current_user.uid

    # Check tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"

    query = db.query(LLMLog).filter(LLMLog.uid == user_id).order_by(desc(LLMLog.ts))

    if tier == "free":
        return HistoryResponse(messages=[])

    logs = query.all()

    messages = []
    for log in logs:
        # Decrypt prompt
        # Note: encrypted_prompt/encrypted_response are stored as BYTEA (bytes)
        # but contain UTF-8 encoded strings with encryption prefixes (fernet:/gcpkms:)
        # We need to decode bytes to string before decrypting
        try:
            prompt_bytes = log.encrypted_prompt
            prompt_str = prompt_bytes.decode("utf-8") if isinstance(prompt_bytes, bytes) else prompt_bytes
            prompt_text = decrypt_prompt(prompt_str, user_dek_ref=user_id)
        except Exception as e:
            logger.error(f"Failed to decrypt prompt for log {log.id}: {e}", exc_info=True)
            prompt_text = "[Encrypted/Unreadable]"

        # Decrypt response
        try:
            response_bytes = log.encrypted_response
            response_str = response_bytes.decode("utf-8") if isinstance(response_bytes, bytes) else response_bytes
            response_text = decrypt_prompt(response_str, user_dek_ref=user_id)
        except Exception as e:
            logger.error(f"Failed to decrypt response for log {log.id}: {e}", exc_info=True)
            response_text = "[Encrypted/Unreadable]"

        messages.append(
            HistoryItem(
                prompt=prompt_text,
                response=response_text,
                timestamp=log.ts.isoformat() if log.ts else "",
            )
        )
    return HistoryResponse(messages=messages)


@router.get("/quota")
def get_quota_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current AI usage quota for the user.

    Returns:
    - **used**: Token usage in current billing-cycle period.
    - **limit**: Token budget for current billing-cycle period.
    - **resets_at**: Time of next reset (billing-cycle anniversary).
    - **tier**: Current subscription plan.
    """
    _ = db  # keep dependency for auth/session parity with existing route contracts
    user_id = current_user.uid
    quota = get_quota_snapshot_sync(user_id)

    return {
        "used": quota["used"],
        "limit": quota["limit"],
        "usage_progress": quota["usage_progress"],
        "usage_copy": quota["usage_copy"],
        "resets_at": quota["resets_at"],
        "tier": quota["tier"],
    }
