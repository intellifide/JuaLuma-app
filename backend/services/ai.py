# Last Modified: 2026-01-18 03:16 CST
import asyncio
import calendar
import datetime
import inspect
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

from fastapi import HTTPException
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable
from google.cloud import firestore

from backend.core import settings
from backend.models import HouseholdMember, Subscription, get_session
from backend.services.prompts import prompt_manager
from backend.services.web_search import (
    format_web_context,
    search_web,
    should_use_web_search,
)
from backend.utils.firestore import get_firestore_client
from backend.utils.logging import log_ai_request

try:
    import vertexai
    from google.cloud import aiplatform
    from vertexai.generative_models import (
        GenerativeModel,
        HarmBlockThreshold,
        HarmCategory,
        Part,
    )

    # Try specialized imports for caching (moved in recent SDK versions)
    try:
        from vertexai.caching import CachedContent
    except ImportError:
        try:
            from vertexai.preview.caching import CachedContent
        except ImportError:
            # Fallback for very old versions or if not found
             from vertexai.preview.generative_models import CachedContent

except ImportError:
    aiplatform = None
    vertexai = None
    GenerativeModel = None  # type: ignore
    CachedContent = None  # type: ignore
    Part = None # type: ignore
    HarmCategory = None # type: ignore
    HarmBlockThreshold = None # type: ignore

logger = logging.getLogger(__name__)

# Constants
# AI Models are now loaded from settings
# Backward-compat shim for services importing this constant.
SAFETY_SETTINGS_LOCAL = None

# Wrapper class to unify local and vertex clients
class AIClient:
    def __init__(self, client_type: str, model: Any):
        self.client_type = client_type
        self.model = model

    async def generate_content(
        self, prompt: str, safety_settings: Any | None = None, system_instruction: str | None = None
    ) -> Any:
        try:
            # For Vertex AI, system_instruction is usually passed at Model initialization,
            # but for single generation, we might need to prepend it or use the chat interface.
            # However, for simplicity and compatibility with existing 'generate_content' flow:
            final_prompt = prompt
            if system_instruction and self.client_type == "vertex":
                 # Similar for Vertex if using basic GenerativeModel without ChatSession
                 final_prompt = f"{system_instruction}\n\n{prompt}"

            if self.client_type == "vertex":
                # vertexai
                response = await self.model.generate_content_async(
                    final_prompt, safety_settings=safety_settings
                )
                return response
        except ResourceExhausted as e:
            logger.warning(f"AI Provider Quota Exceeded: {e}")
            raise HTTPException(
                status_code=429,
                detail="Our AI service is currently at maximum capacity. Please try again in a few minutes.",
            ) from e
        except ServiceUnavailable as e:
            logger.warning(f"AI Provider Unavailable: {e}")
            raise HTTPException(
                status_code=503, detail="The AI assistant is temporarily unavailable. We are working to restore service."
            ) from e
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            raise e

    async def generate_content_stream(
        self, prompt: str, safety_settings: Any | None = None, system_instruction: str | None = None
    ) -> AsyncIterator[str]:
        """Yield incremental text chunks from model generation."""
        try:
            final_prompt = prompt
            if system_instruction:
                final_prompt = f"{system_instruction}\n\n{prompt}"

            if self.client_type != "vertex":
                raise RuntimeError(f"Unsupported AI client type: {self.client_type}")

            result = self.model.generate_content_async(
                final_prompt, safety_settings=safety_settings, stream=True
            )
            stream_obj = await result if inspect.isawaitable(result) else result

            if hasattr(stream_obj, "__aiter__"):
                async for chunk in stream_obj:
                    chunk_text = getattr(chunk, "text", "") or ""
                    if not chunk_text:
                        try:
                            candidates = getattr(chunk, "candidates", None) or []
                            if candidates:
                                parts = candidates[0].content.parts
                                chunk_text = "".join(
                                    part.text for part in parts if getattr(part, "text", None)
                                )
                        except Exception:
                            chunk_text = ""
                    if chunk_text:
                        yield chunk_text
                return

            # Fallback if SDK returns a non-stream response object.
            text = getattr(stream_obj, "text", "") or ""
            if text:
                yield text
        except ResourceExhausted as e:
            logger.warning(f"AI Provider Quota Exceeded: {e}")
            raise HTTPException(
                status_code=429,
                detail="Our AI service is currently at maximum capacity. Please try again in a few minutes.",
            ) from e
        except ServiceUnavailable as e:
            logger.warning(f"AI Provider Unavailable: {e}")
            raise HTTPException(
                status_code=503,
                detail="The AI assistant is temporarily unavailable. We are working to restore service.",
            ) from e
        except Exception as e:
            logger.error(f"Error generating streamed content: {e}")
            raise

    async def generate_with_cache(
        self,
        prompt: str,
        context: str,
        system_instruction: str | None = None,
        ttl_minutes: int = 60,
    ) -> Any:
        """
        Generates content using Vertex AI Context Caching.
        """
        if self.client_type != "vertex" or not CachedContent:
            # Fallback
            full_prompt = prompt
            if context:
                full_prompt = f"{system_instruction or ''}\n\nContext:\n{context}\n\nUser Query:\n{prompt}"
            return await self.generate_content(full_prompt)

        try:
            # Create CachedContent
            # In a real scenario, we'd hash the context and look up an existing cache.
            # Here, we create a fresh one for the high-volume context to save input tokens if reused.
            # Ideally, this should be called with a cache_name if one exists.

            cache = CachedContent.create(
                model_name=settings.ai_model_prod,
                system_instruction=system_instruction,
                contents=[context],
                ttl=datetime.timedelta(minutes=ttl_minutes),
            )

            # Instantiate model from cache
            model = GenerativeModel.from_cached_content(cached_content=cache)
            response = await model.generate_content_async(prompt)
            return response

        except Exception as e:
            logger.error(f"Cached generation error: {e}")
            # Fallback
            full_prompt = prompt
            if context:
                full_prompt = f"{system_instruction or ''}\n\nContext:\n{context}\n\nUser Query:\n{prompt}"
            return await self.generate_content(full_prompt)


def get_ai_client(model_name: str | None = None) -> AIClient:
    """
    Initializes and returns a Vertex AI client.
    """
    project_id = settings.resolved_gcp_project_id
    location = settings.gcp_location

    if not project_id:
        logger.warning("GCP_PROJECT_ID not found for Vertex AI initialization.")

    if vertexai:
        vertexai.init(project=project_id, location=location)
        selected_model = model_name or settings.ai_model_prod or settings.ai_model
        model = GenerativeModel(selected_model)
        logger.info(
            "Initialized Vertex AI client with model %s",
            selected_model,
        )
        return AIClient("vertex", model)
    raise ImportError("google.cloud.aiplatform package is missing.")


# Token budgets per billing-cycle period.
TIER_LIMITS = {
    "free": 20000,
    "essential": 120000,
    "essential_monthly": 120000,
    "pro": 300000,
    "pro_monthly": 300000,
    "pro_annual": 300000,
    "ultimate": 600000,
    "ultimate_monthly": 600000,
    "ultimate_annual": 600000,
}


def _is_paid_tier(tier: str) -> bool:
    return tier.lower() != "free"


def _safe_anchor_day(year: int, month: int, anchor_day: int) -> int:
    return min(anchor_day, calendar.monthrange(year, month)[1])


def _month_start_from_anchor(year: int, month: int, anchor_day: int) -> datetime.datetime:
    day = _safe_anchor_day(year, month, anchor_day)
    return datetime.datetime(year=year, month=month, day=day, tzinfo=datetime.UTC)


def _shift_year_month(year: int, month: int, months: int) -> tuple[int, int]:
    month_index = (month - 1) + months
    shifted_year = year + (month_index // 12)
    shifted_month = (month_index % 12) + 1
    return shifted_year, shifted_month


def _anniversary_period_window(
    now_utc: datetime.datetime, anchor_day: int
) -> tuple[datetime.datetime, datetime.datetime]:
    this_month_start = _month_start_from_anchor(now_utc.year, now_utc.month, anchor_day)
    if now_utc >= this_month_start:
        period_start = this_month_start
        next_year, next_month = _shift_year_month(period_start.year, period_start.month, 1)
        period_end = _month_start_from_anchor(next_year, next_month, anchor_day)
    else:
        prev_year, prev_month = _shift_year_month(now_utc.year, now_utc.month, -1)
        period_start = _month_start_from_anchor(prev_year, prev_month, anchor_day)
        period_end = this_month_start
    return period_start, period_end


def _estimate_tokens_from_text(text: str | None) -> int:
    if not text:
        return 0
    # Deterministic approximation used when provider usage metadata is unavailable.
    return max(1, (len(text) + 3) // 4)


def _resolve_consumed_tokens(
    *,
    prompt_text: str,
    response_text: str,
    prompt_tokens: int,
    response_tokens: int,
) -> tuple[int, int, int]:
    resolved_prompt = prompt_tokens if prompt_tokens > 0 else _estimate_tokens_from_text(prompt_text)
    resolved_response = (
        response_tokens if response_tokens > 0 else _estimate_tokens_from_text(response_text)
    )
    return resolved_prompt, resolved_response, max(1, resolved_prompt + resolved_response)


def _resolve_tier_and_subscription(user_id: str) -> tuple[str, Subscription | None]:
    tier = "free"
    subscription: Subscription | None = None
    db = None
    try:
        session_gen = get_session()
        db = next(session_gen)
        household_member = (
            db.query(HouseholdMember).filter(HouseholdMember.uid == user_id).first()
        )
        if household_member:
            if not household_member.ai_access_enabled:
                raise HTTPException(
                    status_code=403,
                    detail="AI features have been disabled for your account by your household administrator.",
                )
            tier = "ultimate"
            subscription = (
                db.query(Subscription).filter(Subscription.uid == user_id).first()
            )
        else:
            subscription = (
                db.query(Subscription).filter(Subscription.uid == user_id).first()
            )
            if subscription:
                tier = subscription.plan.lower()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error resolving subscription tier context: %s", e)
    finally:
        if db is not None:
            db.close()
    return tier, subscription


def _resolve_anchor_day(tier: str, subscription: Subscription | None) -> int:
    today_day = datetime.datetime.now(datetime.UTC).day
    if subscription is None:
        return today_day
    if tier != "free" and subscription.renew_at:
        return subscription.renew_at.day
    if subscription.created_at:
        return subscription.created_at.day
    if subscription.renew_at:
        return subscription.renew_at.day
    return today_day


def _quota_doc_ref(
    user_id: str, period_start: datetime.datetime
):
    db_fs = get_firestore_client()
    period_key = period_start.date().isoformat()
    return (
        db_fs.collection("ai_quota")
        .document(user_id)
        .collection("anniversary_periods")
        .document(period_key)
    )


def _read_quota_state_sync(user_id: str) -> dict[str, Any]:
    tier, subscription = _resolve_tier_and_subscription(user_id)
    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    now_utc = datetime.datetime.now(datetime.UTC)
    anchor_day = _resolve_anchor_day(tier, subscription)
    period_start, period_end = _anniversary_period_window(now_utc, anchor_day)
    snapshot = _quota_doc_ref(user_id, period_start).get()
    used_tokens = int(
        (snapshot.get("tokens_used") or snapshot.get("request_count") or 0)
        if snapshot.exists
        else 0
    )
    return {
        "tier": tier,
        "limit": limit,
        "used_tokens": used_tokens,
        "period_start": period_start,
        "period_end": period_end,
    }


def resolve_model_routing(tier: str, usage_today: int, limit: int) -> dict[str, Any]:
    normalized_tier = tier.lower().strip()
    paid_limit_exhausted = _is_paid_tier(normalized_tier) and usage_today >= limit

    if normalized_tier == "free":
        return {
            "model": settings.ai_free_model,
            "fallback_applied": False,
            "fallback_reason": None,
            "fallback_message": None,
        }

    if paid_limit_exhausted and settings.ai_paid_fallback_enabled:
        return {
            "model": settings.ai_paid_fallback_model,
            "fallback_applied": True,
            "fallback_reason": "paid_premium_limit_exhausted",
            "fallback_message": settings.ai_paid_fallback_message,
        }

    return {
        "model": settings.ai_paid_model,
        "fallback_applied": False,
        "fallback_reason": None,
        "fallback_message": None,
    }


def _runtime_context_block() -> str:
    now_utc = datetime.datetime.now(datetime.UTC)
    return (
        "Runtime context:\n"
        f"- Current UTC date: {now_utc.date().isoformat()}\n"
        f"- Current UTC timestamp: {now_utc.isoformat()}"
    )


def _client_context_block(client_context: dict[str, Any] | None) -> str:
    if not client_context:
        return ""
    try:
        compact = json.dumps(client_context, ensure_ascii=True, default=str)
    except Exception:
        compact = str(client_context)
    return f"Client app context:\n{compact}"


def _citations_from_web_results(results: list[dict[str, str]]) -> list[dict[str, str]]:
    citations: list[dict[str, str]] = []
    for item in results:
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        citations.append(
            {
                "title": str(item.get("title") or "Source").strip(),
                "url": url,
            }
        )
    return citations


# 2025-12-11 14:15 CST - split rate-limit check from usage increment
def _check_rate_limit_sync(user_id: str) -> tuple[str, int, int]:
    """
    Reads current period token usage without incrementing.
    Returns (tier, limit, current_usage_tokens). Raises HTTP 429 for free overages.
    """
    quota = _read_quota_state_sync(user_id)
    tier = str(quota["tier"])
    limit = int(quota["limit"])
    current_usage = int(quota["used_tokens"])
    period_end = quota["period_end"]

    if tier == "free" and current_usage >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"You have reached your AI usage limit for this period "
                f"({limit} tokens). Resets at {period_end.isoformat()}."
            ),
        )

    return tier, limit, current_usage


def _increment_usage_sync(user_id: str, tier: str, limit: int, token_count: int) -> int:
    """
    Increment token usage atomically within the active anniversary period.
    """
    if token_count <= 0:
        token_count = 1

    quota = _read_quota_state_sync(user_id)
    period_start = quota["period_start"]
    period_end = quota["period_end"]
    doc_ref = _quota_doc_ref(user_id, period_start)
    normalized_tier = str(quota["tier"] or tier)
    effective_limit = int(quota["limit"] or limit)

    @firestore.transactional
    def Increment(transaction, doc_ref):
        snapshot = doc_ref.get(transaction=transaction)
        current_usage = (
            int(snapshot.get("tokens_used") or snapshot.get("request_count") or 0)
            if snapshot.exists
            else 0
        )

        next_usage = current_usage + token_count
        if normalized_tier == "free" and next_usage > effective_limit:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You have reached your AI usage limit for this period "
                    f"({effective_limit} tokens). Resets at {period_end.isoformat()}."
                ),
            )

        if not snapshot.exists:
            transaction.set(
                doc_ref,
                {
                    "tokens_used": token_count,
                    "request_count": 1,
                    "tier": normalized_tier,
                    "period_start": period_start.isoformat(),
                    "period_end": period_end.isoformat(),
                    "updated_at": datetime.datetime.now(datetime.UTC).isoformat(),
                },
            )
            return token_count

        transaction.update(
            doc_ref,
            {
                "tokens_used": firestore.Increment(token_count),
                "request_count": firestore.Increment(1),
                "tier": normalized_tier,
                "period_end": period_end.isoformat(),
                "updated_at": datetime.datetime.now(datetime.UTC).isoformat(),
            },
        )
        return next_usage

    transaction = get_firestore_client().transaction()
    return Increment(transaction, doc_ref)


async def check_rate_limit(user_id: str) -> tuple[str, int, int]:
    """
    Async wrapper that offloads the blocking Firestore/postgres work to a thread.
    """
    return await asyncio.to_thread(_check_rate_limit_sync, user_id)


def get_quota_snapshot_sync(user_id: str) -> dict[str, Any]:
    quota = _read_quota_state_sync(user_id)
    used = int(quota["used_tokens"])
    limit = int(quota["limit"])
    progress = 0.0
    if limit > 0:
        progress = min(max(used / limit, 0.0), 1.0)
    return {
        "tier": str(quota["tier"]),
        "limit": limit,
        "used": used,
        "usage_progress": progress,
        "usage_copy": "AI usage this period",
        "resets_at": quota["period_end"].isoformat(),
    }


async def record_rate_limit_usage(
    user_id: str, tier: str, limit: int, token_count: int
) -> int:
    """
    Async wrapper to increment token usage only after a successful AI call.
    """
    return await asyncio.to_thread(_increment_usage_sync, user_id, tier, limit, token_count)


async def generate_chat_response(  # noqa: C901
    prompt: str,
    context: str | None,
    user_id: str,
    prechecked_limit: tuple[str, int, int] | None = None,
    use_cache: bool = False,
    client_context: dict[str, Any] | None = None,
) -> dict:
    """
    Generates a response using the AI model, enforcing rate limits.
    """
    # 1. Rate Check (read-only) to avoid counting failed requests
    if prechecked_limit:
        tier, limit, current_usage = prechecked_limit
    else:
        tier, limit, current_usage = await check_rate_limit(user_id)

    routing = resolve_model_routing(tier=tier, usage_today=current_usage, limit=limit)
    client = get_ai_client(model_name=str(routing["model"]))

    # 2. Prepare Prompt & System Instructions using PromptManager
    # Fetch dynamically from Vertex AI if available
    context_parts = [part for part in [context or "", _client_context_block(client_context)] if part]
    merged_context = "\n\n".join(context_parts)

    final_prompt = prompt
    if merged_context:
        final_prompt = await prompt_manager.get_rag_prompt(
            context_str=merged_context, user_query=prompt
        )

    citations: list[dict[str, str]] = []
    web_search_used = False
    if settings.ai_web_search_enabled and should_use_web_search(
        prompt, available_context=merged_context
    ):
        try:
            web_results = await asyncio.to_thread(
                search_web, prompt, max_results=settings.ai_web_search_max_results
            )
            web_context = format_web_context(web_results)
            if web_context:
                final_prompt = f"{final_prompt}\n\n{web_context}"
                citations = _citations_from_web_results(web_results)
                web_search_used = True
        except Exception as exc:
            logger.warning("Web search enrichment failed: %s", exc)

    final_prompt = f"{final_prompt}\n\n{_runtime_context_block()}"

    system_instruction = await prompt_manager.get_system_instruction()
    system_instruction = (
        f"{system_instruction}\n\n"
        "When runtime context or web references are provided, treat them as available context "
        "and do not claim you lack access to current date/internet."
    )

    # 3. Call Model
    start_time = time.time()
    try:
        if use_cache and merged_context and client.client_type == "vertex":
            # Use caching if requested and context is present
            response = await client.generate_with_cache(
                prompt=prompt,
                context=merged_context,
                system_instruction=system_instruction,
            )
        else:
            response = await client.generate_content(
                final_prompt,
                safety_settings=None,
                system_instruction=system_instruction
            )
        end_time = time.time()

        # 4. Parse Response
        response_text = ""
        prompt_tokens = 0
        candidates_tokens = 0

        if response.candidates:
            # Logic depends on structure of response object (Vertex vs GenAI)
            try:
                response_text = response.text
            except Exception:
                if response.candidates:
                    parts = [part.text for part in response.candidates[0].content.parts]
                    response_text = "".join(parts)

            # Extract usage metadata if available
            try:
                if hasattr(response, "usage_metadata"):
                    # Both Vertex and GenAI usually expose this in similar way
                    usage = response.usage_metadata
                    # Handle different object types (proto vs object)
                    # For Vertex AI (proto), access fields directly; for GenAI, same.
                    # We use getattr to be safe if keys differ
                    prompt_tokens = getattr(usage, "prompt_token_count", 0)
                    candidates_tokens = getattr(usage, "candidates_token_count", 0)
            except Exception as e:
                logger.warning(f"Failed to extract usage metadata: {e}")

        (
            resolved_prompt_tokens,
            resolved_response_tokens,
            consumed_tokens,
        ) = _resolve_consumed_tokens(
            prompt_text=final_prompt,
            response_text=response_text,
            prompt_tokens=prompt_tokens,
            response_tokens=candidates_tokens,
        )

        # Log formatted request
        log_ai_request(
            prompt=prompt,
            response=response_text,
            tokens_input=resolved_prompt_tokens,
            tokens_output=resolved_response_tokens,
            latency_ms=(end_time - start_time) * 1000,
            model=str(routing["model"]),
            user_id=user_id,
            is_cached=use_cache and bool(context),
        )

        # 5. Persist usage only after success to avoid charging failures
        usage_after = await record_rate_limit_usage(
            user_id,
            tier,
            limit,
            consumed_tokens,
        )

        # 6. Return both the model response and updated usage
        return {
            "response": response_text,
            "usage_today": usage_after,
            "citations": citations,
            "web_search_used": web_search_used,
            "effective_model": routing["model"],
            "fallback_applied": routing["fallback_applied"],
            "fallback_reason": routing["fallback_reason"],
            "fallback_message": routing["fallback_message"],
        }
    except HTTPException:
        # Re-raise HTTPExceptions (like 429/503 from generate_content)
        raise
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="We encountered an issue while processing your AI request. Please try again.",
        ) from e


async def generate_chat_response_stream(
    prompt: str,
    context: str | None,
    user_id: str,
    prechecked_limit: tuple[str, int, int] | None = None,
    client_context: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    Streams model output chunks while preserving existing quota behavior.
    Emits dict events:
    - {"type": "chunk", "delta": "<text>"}
    - {"type": "complete", "response": "<full>", "usage_today": int|None, "tier": str, "limit": int}
    """
    if prechecked_limit:
        tier, limit, _ = prechecked_limit
    else:
        tier, limit, _ = await check_rate_limit(user_id)

    routing = resolve_model_routing(tier=tier, usage_today=prechecked_limit[2] if prechecked_limit else 0, limit=limit)
    client = get_ai_client(model_name=str(routing["model"]))
    context_parts = [part for part in [context or "", _client_context_block(client_context)] if part]
    merged_context = "\n\n".join(context_parts)

    final_prompt = prompt
    if merged_context:
        final_prompt = await prompt_manager.get_rag_prompt(
            context_str=merged_context, user_query=prompt
        )
    citations: list[dict[str, str]] = []
    web_search_used = False
    if settings.ai_web_search_enabled and should_use_web_search(
        prompt, available_context=merged_context
    ):
        yield {"type": "web_search", "status": "started"}
        try:
            web_results = await asyncio.to_thread(
                search_web, prompt, max_results=settings.ai_web_search_max_results
            )
            web_context = format_web_context(web_results)
            if web_context:
                final_prompt = f"{final_prompt}\n\n{web_context}"
                citations = _citations_from_web_results(web_results)
                web_search_used = True
            yield {"type": "web_search", "status": "completed", "results_count": len(citations)}
        except Exception as exc:
            logger.warning("Web search enrichment failed for stream: %s", exc)
            yield {"type": "web_search", "status": "completed", "results_count": 0}
    final_prompt = f"{final_prompt}\n\n{_runtime_context_block()}"
    system_instruction = await prompt_manager.get_system_instruction()
    system_instruction = (
        f"{system_instruction}\n\n"
        "When runtime context or web references are provided, treat them as available context "
        "and do not claim you lack access to current date/internet."
    )

    start_time = time.time()
    chunks: list[str] = []

    try:
        async for delta in client.generate_content_stream(
            final_prompt,
            safety_settings=None,
            system_instruction=system_instruction,
        ):
            chunks.append(delta)
            yield {"type": "chunk", "delta": delta}

        full_response = "".join(chunks)
        end_time = time.time()

        (
            resolved_prompt_tokens,
            resolved_response_tokens,
            consumed_tokens,
        ) = _resolve_consumed_tokens(
            prompt_text=final_prompt,
            response_text=full_response,
            prompt_tokens=0,
            response_tokens=0,
        )

        log_ai_request(
            prompt=prompt,
            response=full_response,
            tokens_input=resolved_prompt_tokens,
            tokens_output=resolved_response_tokens,
            latency_ms=(end_time - start_time) * 1000,
            model=str(routing["model"]),
            user_id=user_id,
            is_cached=False,
        )

        usage_after = await record_rate_limit_usage(
            user_id,
            tier,
            limit,
            consumed_tokens,
        )
        yield {
            "type": "complete",
            "response": full_response,
            "usage_today": usage_after,
            "tier": tier,
            "limit": limit,
            "citations": citations,
            "web_search_used": web_search_used,
            "effective_model": routing["model"],
            "fallback_applied": routing["fallback_applied"],
            "fallback_reason": routing["fallback_reason"],
            "fallback_message": routing["fallback_message"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI stream generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="We encountered an issue while processing your AI request. Please try again.",
        ) from e
