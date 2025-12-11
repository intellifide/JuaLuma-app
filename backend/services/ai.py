import asyncio
import datetime
import logging
from typing import Any, Optional

from fastapi import HTTPException
from firebase_admin import firestore
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

from backend.core import settings
from backend.models import Subscription, get_session
from backend.services.prompts import RAG_PROMPT
from backend.utils.firestore import get_firestore_client

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from google.cloud import aiplatform
    import vertexai
    from vertexai.generative_models import GenerativeModel
except ImportError:
    aiplatform = None
    vertexai = None
    GenerativeModel = None  # type: ignore

logger = logging.getLogger(__name__)

# Constants
# AI Models are now loaded from settings

# Safety settings
SAFETY_SETTINGS_LOCAL = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE",
    },
]

# Wrapper class to unify local and vertex clients
class AIClient:
    def __init__(self, client_type: str, model: Any):
        self.client_type = client_type
        self.model = model

    async def generate_content(self, prompt: str, safety_settings: Optional[Any] = None) -> Any:
        try:
            if self.client_type == "local":
                # google.generativeai
                # Note: async generation might need to be awaited or run differently depending on version
                # genai.GenerativeModel.generate_content_async is available in newer versions
               response = await self.model.generate_content_async(prompt, safety_settings=safety_settings)
               return response
            elif self.client_type == "vertex":
                # vertexai
                response = await self.model.generate_content_async(prompt, safety_settings=safety_settings)
                return response
        except ResourceExhausted as e:
            logger.warning(f"AI Provider Quota Exceeded: {e}")
            raise HTTPException(status_code=429, detail="AI Provider Quota Exceeded. Please try again later.")
        except ServiceUnavailable as e:
            logger.warning(f"AI Provider Unavailable: {e}")
            raise HTTPException(status_code=503, detail="AI Service is temporarily unavailable.")
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            raise e

    async def embed_text(self, text: str) -> list[float]:
        try:
            if self.client_type == "local":
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_query"
                )
                return result['embedding']
            elif self.client_type == "vertex":
                # For Vertex, we need a separate embedding model instance, or use the client
                # Assuming 'text-embedding-004' is available via vertexai logic
                # For simplicity here, if not initialized, we might fail or re-init.
                # Ideally, instantiate embedding model in __init__
                # But for now, let's try to use the vertexai lib directly if possible
                from vertexai.language_models import TextEmbeddingModel
                model = TextEmbeddingModel.from_pretrained("text-embedding-004")
                embeddings = model.get_embeddings([text])
                return embeddings[0].values
        except Exception as e:
            logger.error(f"Error embedding text: {e}")
            # Return empty list or raise
            return []

def get_ai_client() -> AIClient:
    """
    Initializes and returns an AI client based on the environment.
    """
    env = settings.app_env.lower()

    if env == "local":
        api_key = settings.ai_studio_api_key
        if not api_key:
            logger.warning("AI_STUDIO_API_KEY not found for local environment.")

        if genai:
            if api_key:
                genai.configure(api_key=api_key)
            model = genai.GenerativeModel(settings.ai_model_local)
            logger.info(f"Initialized local AI client with model {settings.ai_model_local}")
            return AIClient("local", model)
        else:
            raise ImportError("google.generativeai package is missing.")

    else:
        # Production / Cloud
        project_id = settings.gcp_project_id
        location = settings.gcp_location

        if not project_id:
            logger.warning("GCP_PROJECT_ID not found for production environment.")

        if vertexai:
            vertexai.init(project=project_id, location=location)
            # Use appropriate model for Vertex
            model = GenerativeModel(settings.ai_model_prod)
            logger.info(f"Initialized Vertex AI client with model {settings.ai_model_prod}")
            # Safety settings format might differ for Vertex, handling generally in generation or init
            return AIClient("vertex", model)
        else:
            raise ImportError("google.cloud.aiplatform package is missing.")

TIER_LIMITS = {
    "free": 20,
    "essential": 30,
    "pro": 40,
    "ultimate": 200
}

# 2025-12-11 14:15 CST - split rate-limit check from usage increment
def _check_rate_limit_sync(user_id: str) -> tuple[str, int, int]:
    """
    Reads the user's tier and current usage without incrementing.
    Returns (tier, limit, current_usage). Raises HTTP 429 if already over limit.
    """
    # 1. Get User Tier from Postgres
    tier = "free" # Default
    try:
        # Create a new session for this check
        # Note: In a real app, you might inject the session or cache the tier
        session_gen = get_session()
        db = next(session_gen)
        subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
        if subscription:
            tier = subscription.plan.lower()
        db.close() 
    except Exception as e:
        logger.error(f"Error fetching subscription for rate limit: {e}")
        # Fallback to free tier safely
    
    limit = TIER_LIMITS.get(tier, 20)
    
    # 2. Check Firestore for daily usage (read-only)
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    doc_ref = db_fs.collection("ai_quota").document(user_id).collection("daily_stats").document(today)
    
    snapshot = doc_ref.get()
    current_usage = (snapshot.get("request_count") or 0) if snapshot.exists else 0

    if current_usage >= limit:
        raise HTTPException(status_code=429, detail=f"Daily AI limit reached for {tier} tier ({limit} requests).")
        
    return tier, limit, current_usage


def _increment_usage_sync(user_id: str, tier: str, limit: int) -> int:
    """
    Increment usage atomically, ensuring we stay within limit at commit time.
    """
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    doc_ref = db_fs.collection("ai_quota").document(user_id).collection("daily_stats").document(today)

    @firestore.transactional
    def Increment(transaction, doc_ref):
        snapshot = doc_ref.get(transaction=transaction)
        current_usage = (snapshot.get("request_count") or 0) if snapshot.exists else 0

        if current_usage >= limit:
            raise HTTPException(status_code=429, detail=f"Daily AI limit reached for {tier} tier ({limit} requests).")

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

async def generate_chat_response(
    prompt: str,
    context: Optional[str],
    user_id: str,
    prechecked_limit: Optional[tuple[str, int, int]] = None,
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
    
    # 2. Prepare Prompt
    # If context is provided, inject it.
    final_prompt = prompt
    if context:
        final_prompt = RAG_PROMPT.format(context_str=context, user_query=prompt)
    
    # 3. Call Model
    try:
        response = await client.generate_content(final_prompt, safety_settings=SAFETY_SETTINGS_LOCAL if client.client_type == "local" else None)
        
        # 4. Parse Response
        response_text = ""
        if response.candidates:
             # Logic depends on structure of response object (Vertex vs GenAI)
             # Usually response.text works for both if the wrapper or object supports it
             # But let's be safe
             try:
                 response_text = response.text
             except Exception:
                 parts = [part.text for part in response.candidates[0].content.parts]
                 response_text = "".join(parts)
        
        # 5. Persist usage only after success to avoid charging failures
        usage_after = await record_rate_limit_usage(user_id, tier, limit)

        # 6. Return
        return {
            "usage_today": usage_after
        }
    except HTTPException:
        # Re-raise HTTPExceptions (like 429/503 from generate_content)
        raise
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable or error processing request.")

