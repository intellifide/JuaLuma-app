 
# Updated 2025-12-11 10:30 CST by ChatGPT
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import LLMLog, Subscription, User
from backend.services.ai import generate_chat_response, check_rate_limit, TIER_LIMITS
from backend.services.rag import get_rag_context
from backend.utils import get_db
# Import encryption utils (TIER 3.4)
# Assuming backend/utils/encryption.py exists
from backend.utils.encryption import encrypt_prompt, decrypt_prompt

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str = Field(example="Give me a spending summary for this week.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"message": "How much did I spend on dining last month?"}
            ]
        }
    )

class ChatResponse(BaseModel):
    response: str
    tokens: int = 0
    quota_remaining: Optional[int] = None
    quota_limit: Optional[int] = None
    quota_used: Optional[int] = None
    
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
    messages: List[HistoryItem]
    
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
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    # 1. Get User Subscription/Tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"
    
    # 2. Check rate limit before doing extra work (RAG/model)
    precheck = await check_rate_limit(user_id)
    limit = TIER_LIMITS.get(tier, 20)
    if isinstance(precheck, tuple):
        prechecked_limit = precheck
    else:
        prechecked_limit = (tier, limit, int(precheck) if precheck is not None else 0)
    
    # 3. RAG Context (Essential+ only)
    context = ""
    if tier not in ["free"]:
        # TIER 3.5: RAG Context Injection
        try:
            context = await get_rag_context(user_id, message)
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")
            # Continue without context
    
    # 4. Generate Response (TIER 3.2/3.6)
    # Pass prechecked_limit to avoid duplicate lookups in generate_chat_response.
    result = await generate_chat_response(
        prompt=message,
        context=context,
        user_id=user_id,
        prechecked_limit=prechecked_limit,
    )
    ai_response = result.get("response", "")
    usage_today = result.get("usage_today")
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
    
    # 5. Log to Audit (LLMLog)
    # TIER 3.4: Encryption
    # Encrypt prompt if needed (Essential+). Free tier: maybe don't encrypt or don't store PII?
    # Task 3.4 says "For Essential/Pro/Ultimate tiers, encrypt prompts before logging."
    # We'll encrypt for everyone or just paid? The note specifies keys.
    # We'll default to encrypting if not specifically excluded.
    # Encrypt response as well (since model requires encrypted_response)
    # 2025-12-10 16:46 CST - store ciphertext as bytes to satisfy BYTEA columns
    encrypted_prompt = encrypt_prompt(message, user_dek_ref=user_id)
    encrypted_response = encrypt_prompt(ai_response, user_dek_ref=user_id)
    
    log_entry = LLMLog(
        uid=user_id,
        # tier not in model
        model="gemini-pro", # Hardcoded or from config? distinct from 'tier'
        encrypted_prompt=encrypted_prompt,
        encrypted_response=encrypted_response,
        # context_used not in model
        tokens=0, # tokens_used -> tokens
        user_dek_ref=user_id,
        archived=False
    )
    db.add(log_entry)
    db.commit()
    
    return ChatResponse(
        response=ai_response,
        tokens=0, # Placeholder
        quota_remaining=quota_remaining,
        quota_limit=quota_limit,
        quota_used=quota_used,
    )

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
        query = query.limit(10)
        
    logs = query.all()
    
    messages = []
    for log in logs:
        # Decrypt prompt
        try:
            prompt_text = decrypt_prompt(log.encrypted_prompt, user_dek_ref=user_id)
        except Exception:
            prompt_text = "[Encrypted/Unreadable]"
            
        # Decrypt response
        try:
            response_text = decrypt_prompt(log.encrypted_response, user_dek_ref=user_id)
        except Exception:
            response_text = "[Encrypted/Unreadable]"
            
        messages.append(HistoryItem(
            prompt=prompt_text,
            response=response_text,
            timestamp=log.ts.isoformat() if log.ts else ""
        ))
    return HistoryResponse(messages=messages)

@router.get("/quota")
def get_quota_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current AI usage quota for the user.

    Returns:
    - **used**: Requests made today.
    - **limit**: Daily limit based on tier.
    - **resets_at**: Time of next reset (UTC midnight).
    - **tier**: Current subscription plan.
    """
    user_id = current_user.uid
    
    # 1. Get Tier limit
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"
    
    # Imports should be at top, but check_rate_limit uses TIER_LIMITS which is in ai.py
    # Ideally TIER_LIMITS should be exported or we check logic again. 
    # check_rate_limit in ai.py doesn't export TIER_LIMITS. 
    # I'll re-declare or import it if I can.
    # TIER_LIMITS in backend/services/ai.py is a module-level variable.
    from backend.services.ai import TIER_LIMITS
    
    limit = TIER_LIMITS.get(tier, 20)
    
    # 2. Check Usage (read-only)
    # check_rate_limit modifies usage. 
    # I should implement a read_only version or just read Firestore directly here.
    # Reading Firestore directly is better to avoid side effects.
    
    from backend.utils.firestore import get_firestore_client
    import datetime
    
    db_fs = get_firestore_client()
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    doc_ref = db_fs.collection("ai_quota").document(user_id).collection("daily_stats").document(today)
    
    snapshot = doc_ref.get()
    used = 0
    if snapshot.exists:
        used = snapshot.get("request_count") or 0
        
    # Calculate resets_at (next UTC midnight)
    now = datetime.datetime.now(datetime.timezone.utc)
    tomorrow = now + datetime.timedelta(days=1)
    resets_at = datetime.datetime(year=tomorrow.year, month=tomorrow.month, day=tomorrow.day, tzinfo=datetime.timezone.utc)
    
    return {
        "used": used,
        "limit": limit,
        "resets_at": resets_at.isoformat(),
        "tier": tier
    }
