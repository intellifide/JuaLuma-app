# AI Prompt Templates & Management
# Created: 2026-02-14 — Updated for Vertex AI Prompt Management

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# --- Default Templates (Fallbacks) ---

DEFAULT_RAG_PROMPT = """You are JuaLuma AI, a knowledgeable financial assistant.
Use the provided financial context to give personalized, data-driven answers.
Be specific with numbers, dates, and merchant names when available.
If the context doesn't contain enough information to answer, say so honestly.

{context_str}

User Question:
{user_query}

Guidelines:
- Reference specific transactions and amounts when relevant
- Identify spending patterns and trends
- Be concise and actionable
- Do not make up data not present in the context
"""

DEFAULT_SYSTEM_INSTRUCTION = """You are JuaLuma AI, the financial assistant for the JuaLuma platform.
Your goal is to help users understand their finances, track spending, and make better financial decisions.
Tone: Professional, encouraging, and data-driven.
"""


class PromptManager:
    _instance = None
    _cache: dict[str, Any] = {}
    _cache_ttl: int = 300  # 5 minutes in seconds

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.vertext_prompts_available = False
        try:
            # Attempt to import Vertex AI Prompt utilities
            # Note: The SDK surface for Prompts is evolving. This tries the preview namespace.
            from vertexai.preview import prompts

            self.prompts_lib = prompts
            self.vertext_prompts_available = True
        except ImportError:
            logger.warning(
                "Vertex AI Prompts SDK not available or import failed. Using local defaults."
            )
        except Exception as e:
            logger.warning(f"Error initializing Vertex AI Prompts: {e}")

    async def get_rag_prompt(self, context_str: str, user_query: str) -> str:
        """
        Retrieves the RAG prompt template and formats it.
        ID: 'jualuma-rag-v1' (or similar)
        """
        template = await self._get_template_content(
            "jualuma-rag-v1", DEFAULT_RAG_PROMPT
        )
        try:
            return template.format(context_str=context_str, user_query=user_query)
        except KeyError as e:
            logger.error(f"Prompt formatting error (missing key): {e}")
            logger.info("Falling back to default RAG prompt.")
            return DEFAULT_RAG_PROMPT.format(
                context_str=context_str, user_query=user_query
            )

    async def get_system_instruction(self) -> str:
        """
        Retrieves the system instruction.
        ID: 'jualuma-system-v1'
        """
        return await self._get_template_content(
            "jualuma-system-v1", DEFAULT_SYSTEM_INSTRUCTION
        )

    async def _get_template_content(self, prompt_id: str, default: str) -> str:
        """
        Internal: Fetch template string by ID with caching.
        """
        # 1. Check Cache
        cached = self._cache.get(prompt_id)
        if cached:
            timestamp, content = cached
            if time.time() - timestamp < self._cache_ttl:
                return content

        # 2. Try Fetch from Vertex AI
        if self.vertext_prompts_available:
            try:
                # We fetch using get_prompt() which usually returns an object.
                # Since SDK details vary, we wrap this broadly.
                # In a real deployed app, ensure 'google-cloud-aiplatform>=1.46.0'
                prompt = self.prompts_lib.get_prompt(prompt_name=prompt_id)

                # Extract content. API might return structured object with 'prompt_data' or similar.
                # For this implementation, we assume we want the raw text template.
                # Strategy: inspect available attributes or convert to string.
                content = None
                if hasattr(prompt, "prompt_data"):
                    content = prompt.prompt_data
                elif hasattr(prompt, "text"):
                    content = prompt.text
                elif isinstance(prompt, str):
                    content = prompt

                if content:
                    self._cache[prompt_id] = (time.time(), content)
                    return content
            except Exception:
                # 404 Not Found, PermissionDenied, or SDK mismatch
                # Fail silently to default to keep app running
                pass

        return default


# Global Instance
prompt_manager = PromptManager()
