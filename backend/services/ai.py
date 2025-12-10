import os
import logging
from typing import Any, Optional

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
    GenerativeModel = None # type: ignore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
AI_MODEL_LOCAL = "gemini-2.0-flash-exp" # Or gemini-1.5-flash if 2.5 not available
AI_MODEL_PROD = "gemini-1.5-pro"

# Safety settings
SAFETY_SETTINGS_LOCAL = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
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
    env = os.getenv("App_Env", "local").lower() # Assuming 'App_Env' or similar
    
    if env == "local":
        api_key = os.getenv("AI_STUDIO_API_KEY")
        if not api_key:
            logger.warning("AI_STUDIO_API_KEY not found for local environment.")
            # Depending on strictness, we might raise error or return None
            # raise ValueError("AI_STUDIO_API_KEY is required for local development.")
        
        if genai:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(AI_MODEL_LOCAL)
            logger.info(f"Initialized local AI client with model {AI_MODEL_LOCAL}")
            return AIClient("local", model)
        else:
             raise ImportError("google.generativeai package is missing.")

    else:
        # Production / Cloud
        project_id = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("GCP_LOCATION", "us-central1")
        
        if not project_id:
             logger.warning("GCP_PROJECT_ID not found for production environment.")
        
        if vertexai:
            vertexai.init(project=project_id, location=location)
            # Use appropriate model for Vertex
            model = GenerativeModel(AI_MODEL_PROD)
            logger.info(f"Initialized Vertex AI client with model {AI_MODEL_PROD}")
            # Safety settings format might differ for Vertex, handling generally in generation or init
            return AIClient("vertex", model)
        else:
             raise ImportError("google.cloud.aiplatform package is missing.")

# Check for safety settings format compatibility when calling
import datetime # noqa: E402
from fastapi import HTTPException # noqa: E402
from firebase_admin import firestore # noqa: E402
from backend.utils.firestore import get_firestore_client # noqa: E402
from backend.services.prompts import RAG_PROMPT # noqa: E402
from backend.models import get_session, Subscription # noqa: E402

TIER_LIMITS = {
    "free": 20,
    "essential": 30,
    "pro": 40,
    "ultimate": 200
}

async def check_rate_limit(user_id: str):
    """
    Checks if the user has exceeded their daily AI request limit.
    Uses Firestore to track daily usage.
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
    
    # 2. Check Firestore for daily usage
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    doc_ref = db_fs.collection("ai_quota").document(user_id).collection("daily_stats").document(today)
    
    # Transactional update
    @firestore.transactional
    def CheckAndIncrement(transaction, doc_ref):
        snapshot = doc_ref.get(transaction=transaction)
        current_usage = 0
        if snapshot.exists:
            current_usage = snapshot.get("request_count") or 0
            
        if current_usage >= limit:
            return False, current_usage
            
        # Increment
        if not snapshot.exists:
             transaction.set(doc_ref, {"request_count": 1, "tier": tier, "date": today})
        else:
             transaction.update(doc_ref, {"request_count": firestore.Increment(1)})
        
        return True, current_usage + 1

    transaction = db_fs.transaction()
    allowed, usage = CheckAndIncrement(transaction, doc_ref)
    
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Daily AI limit reached for {tier} tier ({limit} requests).")
        
    return usage

async def generate_chat_response(prompt: str, context: Optional[str], user_id: str) -> dict:
    """
    Generates a response using the AI model, enforcing rate limits.
    """
    # 1. Rate Check
    # This invokes the increment. Ideally we only increment on success, but for rate limiting preventing flood, checking first is key.
    # The implementation above increments on check. If generation fails, we might want to decrement or just count it. 
    # For now, counting attempts is safer for abuse.
    daily_usage = await check_rate_limit(user_id)
    
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
        
        # 5. Return
        return {
            "response": response_text,
            "usage_today": daily_usage
        }
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable or error processing request.")

