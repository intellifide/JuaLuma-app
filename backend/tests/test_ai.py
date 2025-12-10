
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from backend.models import Subscription, LLMLog, User

# Tests for backend/api/ai.py

@pytest.fixture
def mock_ai_services():
    with patch("backend.api.ai.check_rate_limit", new_callable=AsyncMock) as mock_limit, \
         patch("backend.api.ai.generate_chat_response", new_callable=AsyncMock) as mock_gen, \
         patch("backend.api.ai.get_rag_context", new_callable=AsyncMock) as mock_rag, \
         patch("backend.api.ai.encrypt_prompt") as mock_encrypt, \
         patch("backend.api.ai.decrypt_prompt") as mock_decrypt:
        
        mock_limit.return_value = 5 # 5 used today
        mock_gen.return_value = {"response": "This is AI response"}
        mock_rag.return_value = "Retrieved Context"
        mock_encrypt.return_value = "encrypted_prompt"
        mock_decrypt.return_value = "Decrypted Prompt"
        
        yield {
            "check_rate_limit": mock_limit,
            "generate_chat_response": mock_gen,
            "get_rag_context": mock_rag,
            "encrypt_prompt": mock_encrypt,
            "decrypt_prompt": mock_decrypt
        }

def test_chat_success(test_client: TestClient, test_db, mock_auth, mock_ai_services):
    # Ensure subscription (paid tier for RAG check)
    sub = Subscription(uid=mock_auth.uid, plan="pro", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()
    
    payload = {"message": "Hello AI"}
    response = test_client.post("/api/ai/chat", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "This is AI response"
    
    # Verify calls
    mock_ai_services["check_rate_limit"].assert_called_once_with(mock_auth.uid)
    mock_ai_services["get_rag_context"].assert_called_once_with(mock_auth.uid, "Hello AI")
    mock_ai_services["generate_chat_response"].assert_called_once()
    mock_ai_services["encrypt_prompt"].assert_called_once_with("Hello AI", user_dek_ref=mock_auth.uid)
    
    # Verify DB logging
    log = test_db.query(LLMLog).order_by(LLMLog.id.desc()).first()
    assert log is not None
    assert log.response == "This is AI response"
    assert log.prompt == "encrypted_prompt"
    assert log.context_used is True

def test_chat_quota_exceeded(test_client: TestClient, test_db, mock_auth):
    # Needs explicit mock for this test to raise exception
    with patch("backend.api.ai.check_rate_limit", side_effect=HTTPException(status_code=429, detail="Quota exceeded")):
         # Ensure minimal setup if other deps are hit before rate limit (e.g. subscription)
         sub = Subscription(uid=mock_auth.uid, plan="free", status="active", ai_quota_used=0)
         test_db.add(sub)
         test_db.commit()

         payload = {"message": "Hello AI"}
         response = test_client.post("/api/ai/chat", json=payload)
    
    assert response.status_code == 429
    assert "Quota exceeded" in response.json()["detail"]

def test_chat_free_tier_no_rag(test_client: TestClient, test_db, mock_auth, mock_ai_services):
    # Ensure subscription (free tier)
    sub = Subscription(uid=mock_auth.uid, plan="free", status="active", ai_quota_used=0)
    test_db.add(sub)
    test_db.commit()
    
    payload = {"message": "Hello Free AI"}
    response = test_client.post("/api/ai/chat", json=payload)
    
    assert response.status_code == 200
    
    # Verify RAG NOT called
    mock_ai_services["get_rag_context"].assert_not_called()
    mock_ai_services["generate_chat_response"].assert_called_once()
    
    # Verify context_used is False in result call args (kwargs 'context')
    # generate_chat_response(prompt=message, context=context, user_id=user_id)
    call_kwargs = mock_ai_services["generate_chat_response"].call_args.kwargs
    assert call_kwargs.get("context") == ""

def test_chat_history(test_client: TestClient, test_db, mock_auth, mock_ai_services):
    # Setup log entries
    log1 = LLMLog(uid=mock_auth.uid, prompt="enc1", response="resp1", context_used=False)
    log2 = LLMLog(uid=mock_auth.uid, prompt="enc2", response="resp2", context_used=True)
    test_db.add_all([log1, log2])
    test_db.commit()
    
    response = test_client.get("/api/ai/history")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    resps = {m["response"] for m in data["messages"]}
    assert "resp1" in resps
    assert "resp2" in resps
    
    # Verify decryption
    assert mock_ai_services["decrypt_prompt"].call_count == 2
