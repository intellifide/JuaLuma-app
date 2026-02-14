import asyncio
import os
import sys
import time

# Ensure backend modules are importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Set default settings to avoid import errors if env vars missing
os.environ.setdefault("APP_ENV", "production") 
# Note: We need to ensure we use 'vertex' client, so we pretend to be prod or ensure config

from backend.core import settings
from backend.services.ai import get_ai_client

async def test_caching():
    print("Testing Vertex AI Context Caching...")
    
    # 1. Initialize Client
    try:
        # Force production settings if needed, or rely on env
        # settings.app_env = "production" 
        client = get_ai_client()
        print(f"Initialized Client Type: {client.client_type}")
    except Exception as e:
        print(f"Failed to initialize AI Client: {e}")
        return

    if client.client_type != "vertex":
        print("Skipping Context Caching test: Client is not Vertex AI (local mode).")
        print("To test, ensure APP_ENV=production and GCP credentials are set.")
        return

    # 2. Prepare large context
    # Create ~100k chars to make it worthwhile? Or just enough to trigger
    # Vertex AI minimum is high for *persistent* cache, but ephemeral `CachedContent` 
    # might work with less, or throw 400 if too small.
    # Let's try 30k chars (~7k tokens)
    context = "This is a repetition test. " * 1200 
    prompt = "Summarize the content and tell me how many repetitions there roughly are."

    print(f"Context length: {len(context)} chars")

    # 3. Test without cache (baseline)
    print("\n--- Standard Generation ---")
    start_time = time.time()
    try:
        full_prompt = f"Context:\n{context}\n\nUser Query:\n{prompt}"
        response = await client.generate_content(full_prompt)
        duration = time.time() - start_time
        print(f"Time: {duration:.2f}s")
        if hasattr(response, 'text'):
            print(f"Response: {response.text[:100]}...")
        else:
             print("Response received (no text text attribute)")
    except Exception as e:
        print(f"Standard generation failed: {e}")

    # 4. Test with cache
    print("\n--- Cached Generation ---")
    start_time = time.time()
    try:
        response_cached = await client.generate_with_cache(
            prompt=prompt,
            context=context,
            system_instruction="You are a helpful assistant.",
            ttl_minutes=10 
        )
        duration = time.time() - start_time
        print(f"Time: {duration:.2f}s")
        if hasattr(response_cached, 'text'):
             print(f"Response: {response_cached.text[:100]}...")
        else:
             print(f"Response object type: {type(response_cached)}")

    except Exception as e:
        print(f"Cached generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_caching())
