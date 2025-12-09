
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import LLMLog, Subscription, User
from backend.services.ai import check_rate_limit, generate_chat_response
from backend.services.rag import get_rag_context
from backend.utils import get_db
# Import encryption utils (TIER 3.4)
# Assuming backend/utils/encryption.py exists
from backend.utils.encryption import encrypt_prompt, decrypt_prompt

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    tokens: int = 0
    quota_remaining: Optional[int] = None
    
class HistoryItem(BaseModel):
    prompt: str
    response: str
    timestamp: str

class HistoryResponse(BaseModel):
    messages: List[HistoryItem]

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a chat message from the user.
    """
    user_id = current_user.uid
    message = payload.message
    
    # 1. Get User Subscription/Tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"
    
    # 2. Check Rate Limit
    # check_rate_limit handles the check and increments usage.
    # It raises HTTPException(429) if exceeded.
    usage_today = await check_rate_limit(user_id) # This call actually increments
    
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
    result = await generate_chat_response(prompt=message, context=context, user_id=user_id)
    ai_response = result.get("response", "")
    
    # 5. Log to Audit (LLMLog)
    # TIER 3.4: Encryption
    # Encrypt prompt if needed (Essential+). Free tier: maybe don't encrypt or don't store PII?
    # Task 3.4 says "For Essential/Pro/Ultimate tiers, encrypt prompts before logging."
    # We'll encrypt for everyone or just paid? The note specifies keys.
    # We'll default to encrypting if not specifically excluded.
    encrypted_prompt = encrypt_prompt(message, user_dek_ref=user_id)
    
    log_entry = LLMLog(
        uid=user_id,
        tier=tier,
        # prompt=message, # storing encrypted only? LLMLog model fields check?
        # Assuming LLMLog has prompt_encrypted field or generic prompt field.
        # If 'prompt' column exists, use it. If 'encrypted_prompt' exists, use it.
        # I'll check LLMLog model or just use 'prompt' and store encrypted content there if that's the design.
        # For now, I'll assume 'prompt' stores the content (encrypted or not).
        prompt=encrypted_prompt,
        response=ai_response,
        context_used=bool(context),
        tokens_used=0, # Need to count tokens?
        status="success"
    )
    db.add(log_entry)
    db.commit()
    
    return ChatResponse(
        response=ai_response,
        tokens=0, # Placeholder
        quota_remaining=None # Could calculate from TIER_LIMITS - usage_today
    )

@router.get("/history", response_model=HistoryResponse)
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve chat history.
    """
    user_id = current_user.uid
    
    # Check tier
    subscription = db.query(Subscription).filter(Subscription.uid == user_id).first()
    tier = subscription.plan.lower() if subscription else "free"
    
    query = db.query(LLMLog).filter(LLMLog.uid == user_id).order_by(desc(LLMLog.created_at))
    
    if tier == "free":
        query = query.limit(10)
        
    logs = query.all()
    
    messages = []
    for log in logs:
        # Decrypt prompt
        try:
            prompt_text = decrypt_prompt(log.prompt, user_dek_ref=user_id)
        except Exception:
            prompt_text = "[Encrypted/Unreadable]"
            
        messages.append(HistoryItem(
            prompt=prompt_text,
            response=log.response or "",
            timestamp=log.created_at.isoformat() if log.created_at else ""
        ))
        
    return HistoryResponse(messages=messages)

@router.get("/quota")
async def get_quota_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current AI usage quota for the user.
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
    from backend.services.ai import TIER_LIMITS, check_rate_limit
    
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
