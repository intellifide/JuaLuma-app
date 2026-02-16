# Last Modified: 2026-01-18 03:16 CST
import asyncio
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


def get_ai_client() -> AIClient:
    """
    Initializes and returns a Vertex AI client.
    """
    project_id = settings.resolved_gcp_project_id
    location = settings.gcp_location

    if not project_id:
        logger.warning("GCP_PROJECT_ID not found for Vertex AI initialization.")

    if vertexai:
        vertexai.init(project=project_id, location=location)
        selected_model = settings.ai_model_prod or settings.ai_model
        model = GenerativeModel(selected_model)
        logger.info(
            "Initialized Vertex AI client with model %s",
            selected_model,
        )
        return AIClient("vertex", model)
    raise ImportError("google.cloud.aiplatform package is missing.")


TIER_LIMITS = {
    "free": 10,
    "essential": 30,
    "essential_monthly": 30,
    "pro": 40,
    "pro_monthly": 40,
    "pro_annual": 40,
    "ultimate": 80,
    "ultimate_monthly": 80,
    "ultimate_annual": 80,
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
    Reads the user's tier and current usage without incrementing.
    Returns (tier, limit, current_usage). Raises HTTP 429 if already over limit.
    """
    # 1. Get User Tier from Postgres
    tier = "free"  # Default
    try:
        # Create a new session for this check
        # Note: In a real app, you might inject the session or cache the tier
        session_gen = get_session()
        db = next(session_gen)

        # 1a. Check Household Context first (Overrides subscription)
        household_member = (
            db.query(HouseholdMember).filter(HouseholdMember.uid == user_id).first()
        )
        if household_member:
            if not household_member.ai_access_enabled:
                raise HTTPException(
                    status_code=403,
                    detail="AI features have been disabled for your account by your household administrator.",
                )
            # Members inherit Ultimate status
            tier = "ultimate"
        else:
            # 1b. Fallback to personal subscription
            subscription = (
                db.query(Subscription).filter(Subscription.uid == user_id).first()
            )
            if subscription:
                tier = subscription.plan.lower()
        db.close()
        db.close()
    except HTTPException:
        # Re-raise explicit HTTP exceptions (e.g. 403 Forbidden)
        raise
    except Exception as e:
        logger.error(f"Error fetching subscription for rate limit: {e}")
        # Fallback to free tier safely

    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    # 2. Check Firestore for daily usage (read-only)
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    doc_ref = (
        db_fs.collection("ai_quota")
        .document(user_id)
        .collection("daily_stats")
        .document(today)
    )

    snapshot = doc_ref.get()
    current_usage = (snapshot.get("request_count") or 0) if snapshot.exists else 0

    if current_usage >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"You have reached your daily limit of {limit} AI requests for the {tier} tier.",
        )

    return tier, limit, current_usage


def _increment_usage_sync(user_id: str, tier: str, limit: int) -> int:
    """
    Increment usage atomically, ensuring we stay within limit at commit time.
    """
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    doc_ref = (
        db_fs.collection("ai_quota")
        .document(user_id)
        .collection("daily_stats")
        .document(today)
    )

    @firestore.transactional
    def Increment(transaction, doc_ref):
        snapshot = doc_ref.get(transaction=transaction)
        current_usage = (snapshot.get("request_count") or 0) if snapshot.exists else 0

        if current_usage >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"You have reached your daily limit of {limit} AI requests for the {tier} tier.",
            )

        if not snapshot.exists:
            transaction.set(doc_ref, {"request_count": 1, "tier": tier, "date": today})
            return 1

        transaction.update(doc_ref, {"request_count": firestore.Increment(1)})
        return current_usage + 1

    transaction = db_fs.transaction()
    return Increment(transaction, doc_ref)


async def check_rate_limit(user_id: str) -> tuple[str, int, int]:
    """
    Async wrapper that offloads the blocking Firestore/postgres work to a thread.
    """
    return await asyncio.to_thread(_check_rate_limit_sync, user_id)


async def record_rate_limit_usage(user_id: str, tier: str, limit: int) -> int:
    """
    Async wrapper to increment usage only after a successful AI call.
    """
    return await asyncio.to_thread(_increment_usage_sync, user_id, tier, limit)


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

    client = get_ai_client()

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

        # Log formatted request
        log_ai_request(
            prompt=prompt,
            response=response_text,
            tokens_input=prompt_tokens,
            tokens_output=candidates_tokens,
            latency_ms=(end_time - start_time) * 1000,
            model=settings.ai_model_prod or settings.ai_model,
            user_id=user_id,
            is_cached=use_cache and bool(context),
        )

        # 5. Persist usage only after success to avoid charging failures
        usage_after = await record_rate_limit_usage(user_id, tier, limit)

        # 6. Return both the model response and updated usage
        return {
            "response": response_text,
            "usage_today": usage_after,
            "citations": citations,
            "web_search_used": web_search_used,
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

    client = get_ai_client()
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

        log_ai_request(
            prompt=prompt,
            response=full_response,
            tokens_input=0,
            tokens_output=0,
            latency_ms=(end_time - start_time) * 1000,
            model=settings.ai_model_prod or settings.ai_model,
            user_id=user_id,
            is_cached=False,
        )

        usage_after = await record_rate_limit_usage(user_id, tier, limit)
        yield {
            "type": "complete",
            "response": full_response,
            "usage_today": usage_after,
            "tier": tier,
            "limit": limit,
            "citations": citations,
            "web_search_used": web_search_used,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI stream generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="We encountered an issue while processing your AI request. Please try again.",
        ) from e
