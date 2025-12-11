# Updated 2025-12-11 01:35 CST by ChatGPT
import asyncio
import logging

from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.core import configure_logging, settings
from backend.api.auth import router as auth_router
from backend.api.accounts import router as accounts_router
from backend.api.plaid import router as plaid_router
from backend.api.transactions import router as transactions_router
from backend.api.analytics import router as analytics_router
from backend.api.ai import router as ai_router
from backend.api.widgets import router as widgets_router
from backend.api.developers import router as developers_router
from backend.api.support import router as support_router
from backend.api.users import router as users_router
from backend.models.base import engine
from backend.utils import get_db  # noqa: F401 - imported for dependency wiring

configure_logging(service_name=settings.service_name)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Finity API",
    description="Financial aggregation and AI-powered planning platform",
    version="0.1.0",
)

# CORS configuration for local development
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
app.include_router(widgets_router)
app.include_router(developers_router)
app.include_router(support_router)
app.include_router(users_router)



@app.get("/")
@app.get("/api")
async def root():
    """Lightweight service descriptor for uptime checks and metadata."""
    return {
        "message": "Finity API",
        "environment": settings.app_env,
        "version": "0.1.0",
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """
    Active health probe for orchestrators and local dev tooling.
    """
    checks: dict[str, str] = {}
    overall_healthy = True

    # Database connectivity
    def _probe_db() -> None:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

    try:
        await asyncio.to_thread(_probe_db)
        checks["database"] = "connected"
    except Exception as exc:  # pragma: no cover - defensive logging
        overall_healthy = False
        checks["database"] = f"error:{exc.__class__.__name__}"
        logger.exception("Database health check failed.")

    # Firestore connectivity (emulator or production)
    if settings.firestore_healthcheck_enabled:
        try:
            from backend.utils.firestore import get_firestore_client

            client = await asyncio.to_thread(get_firestore_client)

            def _probe_firestore() -> None:
                iterator = iter(client.collections())
                try:
                    next(iterator)
                except StopIteration:
                    # No collections yet, but connectivity is successful
                    pass

            await asyncio.to_thread(_probe_firestore)
            checks["firestore"] = "connected"
        except Exception as exc:  # pragma: no cover - defensive logging
            overall_healthy = False
            checks["firestore"] = f"error:{exc.__class__.__name__}"
            logger.exception("Firestore health check failed.")

    status_code = (
        status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    payload = {"status": "healthy" if overall_healthy else "unhealthy", **checks}
    return JSONResponse(content=payload, status_code=status_code)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
