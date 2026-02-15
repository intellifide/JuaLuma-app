import logging
from typing import Any

logger = logging.getLogger(__name__)

def log_ai_request(
    prompt: str,
    response: str,
    tokens_input: int,
    tokens_output: int,
    latency_ms: float,
    model: str,
    user_id: str,
    is_cached: bool = False,
    error: str | None = None
) -> None:
    """
    Logs structured AI request data for Cloud Logging analysis.
    """
    payload: dict[str, Any] = {
        "event_type": "ai_generation",
        "user_id": user_id,
        "model": model,
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "tokens_total": tokens_input + tokens_output,
        "latency_ms": latency_ms,
        "is_cached": is_cached,
        "prompt_length": len(prompt),
        "response_length": len(response) if response else 0,
    }

    if error:
        payload["error"] = error
        logger.error("AI Request Failed", extra=payload)
    else:
        logger.info("AI Request Completed", extra=payload)
