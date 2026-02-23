# Updated 2025-12-11 01:35 CST by ChatGPT
import asyncio
import contextlib
import logging
import typing as _t
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.api.accounts import router as accounts_router
from backend.api.ai import router as ai_router
from backend.api.analytics import router as analytics_router
from backend.api.auth import router as auth_router
from backend.api.billing import router as billing_router
from backend.api.budgets import router as budgets_router
from backend.api.developers import router as developers_router
from backend.api.digests import router as digests_router
from backend.api.documents import router as documents_router
from backend.api.household import router as household_router
from backend.api.jobs import router as jobs_router
from backend.api.legal import router as legal_router
from backend.api.manual_assets import router as manual_assets_router
from backend.api.notifications import router as notifications_router
from backend.api.plaid import router as plaid_router
from backend.api.plaid_webhooks import router as plaid_webhooks_router
from backend.api.recurring import router as recurring_router
from backend.api.support import router as support_router
from backend.api.support_portal import router as support_portal_router
from backend.api.transactions import router as transactions_router
from backend.api.users import router as users_router
from backend.api.webhooks import router as webhooks_router
from backend.api.widgets import router as widgets_router
from backend.core import configure_logging, settings
from backend.core.events import initialize_events

# MCP Imports (optional in non-dev runtime images)
try:
    from backend.mcp_server import mcp
except ModuleNotFoundError:
    mcp = None
from backend.middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from backend.models import SessionLocal
from backend.models.base import engine
from backend.services.pending_signup_cleanup import cleanup_stale_pending_signups
from backend.utils import get_db  # noqa: F401 - imported for dependency wiring

configure_logging(service_name=settings.service_name)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI app.
    Handles startup (Pub/Sub init) and shutdown tasks.
    """
    if settings.app_env.lower() == "test":
        yield
        return

    try:
        # Initialize Pub/Sub events (Idempotent)
        await asyncio.to_thread(initialize_events)
    except Exception as e:
        logger.error(f"Failed to initialize event bus: {e}")

    cleanup_task = asyncio.create_task(_pending_signup_cleanup_loop())

    yield

    cleanup_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await cleanup_task


async def _pending_signup_cleanup_loop() -> None:
    interval_hours = 6
    while True:
        db = None
        try:
            db = SessionLocal()
            removed = cleanup_stale_pending_signups(db, hours=24)
            if removed:
                logger.info(f"Cleanup: removed {removed} stale pending signup(s).")
        except Exception as exc:
            logger.error(f"Cleanup: failed to remove stale pending signups: {exc}")
        finally:
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
        await asyncio.sleep(interval_hours * 3600)


app = FastAPI(
    title="jualuma API",
    description="Financial aggregation and AI-powered planning platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Observability and protection middleware
app.add_middleware(RequestContextMiddleware)

# Disable rate limiting for automated tests to avoid spurious 429s.
if settings.app_env.lower() != "test":
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.rate_limit_max_requests,
        window_seconds=settings.rate_limit_window_seconds,
        # Limit API calls only (not static/proxy paths). "/api" includes "/api/auth" and "/api/health".
        path_prefixes=("/api",),
    )

app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration (fail-safe: no wildcard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(accounts_router)
app.include_router(plaid_router)
app.include_router(transactions_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(legal_router)
app.include_router(manual_assets_router)
app.include_router(widgets_router)
app.include_router(developers_router)
app.include_router(household_router)
app.include_router(support_router)
app.include_router(users_router)
app.include_router(billing_router)
app.include_router(budgets_router)
app.include_router(webhooks_router)
app.include_router(plaid_webhooks_router)
app.include_router(notifications_router)
app.include_router(support_portal_router)  # New router inclusion
app.include_router(documents_router)
app.include_router(recurring_router)
app.include_router(digests_router)
app.include_router(jobs_router)

# Initialize and Mount Main MCP Server (Phase 3)
# FastMCP instances are ASGI apps, so we mount them directly into FastAPI
# Compatibility: 'sse_app' (v0.x) vs 'http_app' (v2.x)
if mcp is None:
    logger.warning("MCP server module is not available; skipping /mcp mount.")
else:
    mcp_app = getattr(mcp, "sse_app", getattr(mcp, "http_app", None))
    if mcp_app:
        app.mount("/mcp", mcp_app)
    else:
        logger.warning("Could not find ASGI app attribute on FastMCP instance.")

# Initialize and Mount Dev Tools MCP Server (Phase 4)
# Only mount dangerous dev tools in LOCAL environment
if settings.app_env.lower() == "local":
    from backend.dev_tools.mcp_server import dev_mcp  # noqa: E402

    dev_app = getattr(dev_mcp, "sse_app", getattr(dev_mcp, "http_app", None))
    if dev_app:
        app.mount("/mcp-dev", dev_app)


# Structured error handlers ----------------------------------------------------
def _sanitize_for_json(obj: _t.Any) -> _t.Any:
    """Ensure value is JSON-serializable (e.g. Pydantic errors can contain Exception in ctx)."""
    if obj is None or isinstance(obj, bool | int | float | str):
        return obj
    if isinstance(obj, Exception):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list | tuple):
        return [_sanitize_for_json(v) for v in obj]
    return str(obj)


def _build_error_response(
    *,
    status_code: int,
    error: str,
    message: str,
    request: Request,
    extra: dict[str, _t.Any] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    payload: dict[str, _t.Any] = {
        "error": error,
        "message": message,
        "detail": message,
        "request_id": request_id,
    }
    if extra:
        payload.update(extra)
    payload = _sanitize_for_json(payload)
    return JSONResponse(status_code=status_code, content=payload)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code_map = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
    }
    error_code = code_map.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return _build_error_response(
        status_code=exc.status_code,
        error=error_code,
        message=message,
        request=request,
    )


@app.exception_handler(StarletteHTTPException)
async def starlette_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code_map = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
    }
    error_code = code_map.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return _build_error_response(
        status_code=exc.status_code,
        error=error_code,
        message=message,
        request=request,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Attempt to extract a human-readable message from the first error
    errors = exc.errors()
    raw_body = None
    if settings.is_local:
        try:
            body_bytes = await request.body()
            if body_bytes:
                raw_body = body_bytes.decode("utf-8", errors="replace")
        except Exception:
            raw_body = None
    if errors:
        logger.warning(
            "Request validation error.",
            extra={"path": str(request.url.path), "errors": errors},
        )
    if errors:
        err = errors[0]
        field = ".".join(str(p) for p in err.get("loc", []) if p != "body")
        msg = err.get("msg", "Invalid input")
        # Sanitize common pydantic messages
        if "string_too_short" in err.get("type", ""):
            min_len = err.get("ctx", {}).get("min_length", "?")
            msg = f"must be at least {min_len} characters long"
        elif "string_too_long" in err.get("type", ""):
            max_len = err.get("ctx", {}).get("max_length", "?")
            msg = f"must be at most {max_len} characters long"

        friendly_message = f"Invalid {field}: {msg}" if field else f"Invalid input: {msg}"
    else:
        friendly_message = "Invalid request data."

    extra = {"errors": errors} if settings.is_local else None
    if raw_body and settings.is_local:
        if extra is None:
            extra = {}
        extra["raw_body"] = raw_body
    return _build_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        error="bad_request",
        message=friendly_message,
        request=request,
        extra=extra,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:  # pragma: no cover - defensive fallback
    logger.exception("Unhandled exception")
    return _build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error="internal_error",
        message="An unexpected error occurred.",
        request=request,
    )


@app.get("/")
@app.get("/api")
async def root():
    """Lightweight service descriptor for uptime checks and metadata."""
    return {
        "message": "jualuma API",
        "environment": settings.app_env,
        "version": "0.1.0",
    }


async def _probe_db_health(checks: dict):
    def _do_probe():
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

    try:
        await asyncio.to_thread(_do_probe)
        checks["database"] = "connected"
    except Exception as exc:
        checks["database"] = f"error:{exc.__class__.__name__}"
        logger.error(f"Database health check failed: {exc}")
        return False
    return True


async def _probe_firestore_health(checks: dict):
    if not settings.firestore_healthcheck_enabled:
        return True
    try:
        from backend.utils.firestore import get_firestore_client

        client = await asyncio.to_thread(get_firestore_client)

        def _do_probe():
            it = iter(client.collections())
            try:
                next(it)
            except StopIteration:
                pass

        await asyncio.to_thread(_do_probe)
        checks["firestore"] = "connected"
    except Exception as exc:
        checks["firestore"] = f"error:{exc.__class__.__name__}"
        logger.error(f"Firestore health check failed: {exc}")
        return False
    return True


async def _probe_plaid_health(checks: dict):
    try:
        from backend.services.plaid import get_plaid_client

        pc = get_plaid_client()
        await asyncio.to_thread(pc.categories_get, {})
        checks["plaid"] = "connected"
    except Exception as exc:
        checks["plaid"] = f"error:{exc.__class__.__name__}"
        logger.error(f"Plaid health check failed: {exc}")
        return False
    return True


async def _probe_ai_health(checks: dict):
    try:
        from backend.services.ai import get_ai_client

        ac = get_ai_client()
        if ac and ac.model:
            checks["ai_assistant"] = "connected"
        else:
            checks["ai_assistant"] = "initialization_failed"
            return False
    except Exception as exc:
        checks["ai_assistant"] = f"error:{exc.__class__.__name__}"
        logger.error(f"AI Assistant health check failed: {exc}")
        return False
    return True


async def _probe_web3_health(checks: dict):
    try:
        from web3 import HTTPProvider, Web3

        w3 = Web3(HTTPProvider(settings.eth_rpc_url))
        if await asyncio.to_thread(w3.is_connected):
            checks["web3"] = "connected"
        else:
            checks["web3"] = "disconnected"
            return False
    except Exception as exc:
        checks["web3"] = f"error:{exc.__class__.__name__}"
        logger.error(f"Web3 health check failed: {exc}")
        return False
    return True


async def _probe_cex_health(checks: dict):
    try:
        import ccxt

        binance = ccxt.binance()
        await asyncio.to_thread(binance.fetch_time)
        checks["cex"] = "connected"
    except Exception as exc:
        checks["cex"] = f"error:{exc.__class__.__name__}"
        logger.error(f"CEX health check failed: {exc}")
        return False
    return True


async def _probe_marketplace_health(checks: dict):
    def _do_probe():
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM widgets LIMIT 1"))

    try:
        await asyncio.to_thread(_do_probe)
        checks["marketplace"] = "connected"
    except Exception as exc:
        checks["marketplace"] = f"error:{exc.__class__.__name__}"
        logger.error(f"Marketplace health check failed: {exc}")
        return False
    return True


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """
    Active health probe for orchestrators and local dev tooling.
    """
    checks: dict[str, str] = {}

    results = await asyncio.gather(
        _probe_db_health(checks),
        _probe_firestore_health(checks),
        _probe_plaid_health(checks),
        _probe_ai_health(checks),
        _probe_web3_health(checks),
        _probe_cex_health(checks),
        _probe_marketplace_health(checks),
    )

    overall_healthy = all(results)
    status_str = "healthy" if overall_healthy else "degraded"
    return JSONResponse(content={"status": status_str, **checks}, status_code=200)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
