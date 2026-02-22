"""Lightweight web search enrichment for AI assistant prompts."""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)


def _flatten_related(topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flattened: list[dict[str, Any]] = []
    for topic in topics:
        if not isinstance(topic, dict):
            continue
        if "Topics" in topic and isinstance(topic["Topics"], list):
            flattened.extend(_flatten_related(topic["Topics"]))
            continue
        text = str(topic.get("Text") or "").strip()
        url = str(topic.get("FirstURL") or "").strip()
        if text:
            flattened.append({"title": text, "url": url, "snippet": text})
    return flattened


def search_web(query: str, *, max_results: int = 5) -> list[dict[str, str]]:
    """Return a compact list of web references for a query."""
    clean_query = (query or "").strip()
    if not clean_query:
        return []

    params = urlencode(
        {
            "q": clean_query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1",
        }
    )
    url = f"https://api.duckduckgo.com/?{params}"
    req = Request(url, headers={"User-Agent": "jualuma-ai-assistant/1.0"})

    try:
        with urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("Web search request failed: %s", exc)
        return []

    results: list[dict[str, str]] = []
    abstract = str(payload.get("AbstractText") or "").strip()
    abstract_url = str(payload.get("AbstractURL") or "").strip()
    heading = str(payload.get("Heading") or "").strip()
    if abstract:
        results.append(
            {
                "title": heading or "Summary",
                "url": abstract_url,
                "snippet": abstract,
            }
        )

    related = payload.get("RelatedTopics") if isinstance(payload, dict) else []
    flattened = _flatten_related(related if isinstance(related, list) else [])
    for item in flattened:
        results.append(
            {
                "title": str(item.get("title") or "").strip(),
                "url": str(item.get("url") or "").strip(),
                "snippet": str(item.get("snippet") or "").strip(),
            }
        )
        if len(results) >= max_results:
            break

    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in results:
        key = f"{item.get('title','')}|{item.get('url','')}".strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= max_results:
            break

    return deduped


def should_use_web_search(query: str, *, available_context: str = "") -> bool:
    """
    Adaptive decision for external web search.

    Strategy:
    - Always search if user explicitly asks for web/internet/news/current info.
    - Prefer no search for personal-account questions when we already have rich context.
    - Search by default for broad/general-knowledge questions where account data is unlikely
      to be sufficient.
    """
    q = " ".join((query or "").lower().split())
    if not q:
        return False

    explicit_web_terms = {
        "search the web",
        "search web",
        "on the internet",
        "look online",
        "latest",
        "breaking news",
        "current events",
        "today's date",
        "todays date",
        "date today",
        "right now",
        "this week in news",
    }
    if any(term in q for term in explicit_web_terms):
        return True

    personal_finance_terms = {
        "my",
        "me",
        "mine",
        "account",
        "accounts",
        "transactions",
        "spending",
        "budget",
        "cash flow",
        "net worth",
        "subscription",
        "plaid",
        "support ticket",
        "settings",
        "household",
    }
    asks_personal_finance = any(term in q for term in personal_finance_terms)

    context_lower = (available_context or "").lower()
    has_meaningful_context = len(context_lower) > 120
    has_numeric_finance_context = any(token in context_lower for token in ("$", "transactions", "spending", "net worth"))

    if asks_personal_finance and has_meaningful_context and has_numeric_finance_context:
        return False

    general_knowledge_starters = (
        q.startswith("what is"),
        q.startswith("who is"),
        q.startswith("when did"),
        q.startswith("where is"),
        q.startswith("why"),
        q.startswith("how does"),
        "compare" in q,
        "vs " in q,
    )
    if any(general_knowledge_starters):
        return True

    # If context is sparse and this is not clearly personal-finance, prefer web augmentation.
    if not asks_personal_finance and not has_meaningful_context:
        return True

    return False


def format_web_context(results: list[dict[str, str]]) -> str:
    if not results:
        return ""
    lines = ["Web references:"]
    for idx, item in enumerate(results, start=1):
        title = item.get("title", "").strip()
        snippet = item.get("snippet", "").strip()
        url = item.get("url", "").strip()
        lines.append(f"{idx}. {title}")
        if snippet:
            lines.append(f"   - {snippet}")
        if url:
            lines.append(f"   - Source: {url}")
    return "\n".join(lines)
