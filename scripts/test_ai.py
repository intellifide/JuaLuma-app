# Updated 2025-12-07 21:24 CST by ChatGPT
"""
Quick AI Studio connectivity check using Gemini 2.0 Flash.
Requires env var AI_STUDIO_API_KEY (do not commit real keys).
Respects optional GEMINI_MODEL and AI_STUDIO_BASE_URL overrides.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
from dotenv import load_dotenv


def main() -> None:
    load_dotenv()

    api_key = os.getenv("AI_STUDIO_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    base_url = os.getenv(
        "AI_STUDIO_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
    )

    if not api_key or api_key.strip().lower() in {"", "your_api_key_here"}:
        raise SystemExit("AI_STUDIO_API_KEY is not set. Aborting connectivity test.")

    endpoint = f"{base_url}/models/{model}:generateContent"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "jualuma local dev health check: one short sentence about AI.",
                    }
                ]
            }
        ]
    }

    headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}

    attempts = 3
    last_error: str | None = None

    for attempt in range(1, attempts + 1):
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(endpoint, headers=headers, json=payload)
            resp.raise_for_status()
            data: Any = resp.json()
            break
        except httpx.HTTPStatusError as exc:  # type: ignore[attr-defined]
            status = exc.response.status_code
            body = exc.response.text
            last_error = f"HTTP {status}: {body}"
            if status == 429 and attempt < attempts:
                time.sleep(2 * attempt)
                continue
            raise SystemExit(
                f"AI Studio connectivity failed after {attempt} attempt(s): {last_error}"
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive
            last_error = str(exc)
            if attempt < attempts:
                time.sleep(2 * attempt)
                continue
            raise SystemExit(
                f"AI Studio connectivity failed after {attempt} attempt(s): {last_error}"
            ) from exc

    text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    snippet = text[:200] if text else "<no text returned>"
    print("AI Studio connectivity OK. Snippet:", snippet)


if __name__ == "__main__":
    main()
