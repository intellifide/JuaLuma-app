"""Security and observability middleware."""

from __future__ import annotations

import time
import uuid
from collections import deque
from collections.abc import Iterable
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.logging import get_request_id, set_request_id

ACTIVE_RATE_LIMITER: RateLimitMiddleware | None = None


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Adds a per-request UUID and timestamp for traceability.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        request.state.timestamp = time.time()
        set_request_id(request_id)

        try:
            response = await call_next(request)
        finally:
            # Always reset contextvar to avoid leaking across requests
            set_request_id(None)

        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enforce common security headers on every response.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory sliding window rate limiter keyed by client IP.

    This is intentionally lightweight to avoid new runtime dependencies.
    """

    def __init__(
        self,
        app,
        *,
        max_requests: int = 100,
        window_seconds: int = 60,
        path_prefixes: Iterable[str] = ("/api/auth", "/", "/health", "/api/health"),
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.path_prefixes = tuple(path_prefixes)
        self._attempts: dict[str, deque[float]] = {}
        self._lock = Lock()
        # Expose the limiter for tests/administration
        global ACTIVE_RATE_LIMITER
        ACTIVE_RATE_LIMITER = self

    async def dispatch(self, request: Request, call_next):
        path = request.url.path or ""
        if self._should_limit(path):
            limited = self._check_limit(request)
            if limited:
                return limited

        return await call_next(request)

    def _should_limit(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.path_prefixes)

    def _check_limit(self, request: Request) -> JSONResponse | None:
        now = time.time()
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        with self._lock:
            window = self._attempts.setdefault(client_ip, deque())
            while window and window[0] <= now - self.window_seconds:
                window.popleft()
            if len(window) >= self.max_requests:
                return self._too_many(request)

            window.append(now)
        return None

    def _too_many(self, request: Request) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None) or get_request_id()
        payload = {
            "error": "too_many_requests",
            "message": "Rate limit exceeded. Please try again later.",
            "request_id": request_id,
        }
        return JSONResponse(status_code=429, content=payload)

    def reset(self) -> None:
        """Clear rate limit counters (primarily for testing)."""
        with self._lock:
            self._attempts.clear()


__all__ = [
    "RateLimitMiddleware",
    "RequestContextMiddleware",
    "SecurityHeadersMiddleware",
    "ACTIVE_RATE_LIMITER",
]
