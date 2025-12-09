# Updated 2025-12-08 21:27 CST by ChatGPT
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from backend.api.auth import router as auth_router
from backend.api.accounts import router as accounts_router
from backend.api.plaid import router as plaid_router
from backend.api.transactions import router as transactions_router
from backend.api.analytics import router as analytics_router
from backend.api.ai import router as ai_router
from backend.api.widgets import router as widgets_router
from backend.api.developers import router as developers_router
from backend.utils import get_db  # noqa: F401 - imported for dependency wiring

# Load environment variables early
load_dotenv()

app = FastAPI(
    title="Finity API",
    description="Financial aggregation and AI-powered planning platform",
    version="0.1.0",
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
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



@app.get("/")
@app.get("/api")
async def root():
    return {
        "message": "Finity API",
        "environment": os.getenv("APP_ENV", "unknown"),
        "version": "0.1.0",
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    # TODO: wire real health checks for Postgres, Firestore, Pub/Sub
    return {
        "status": "healthy",
        "database": "connected",
        "firestore": "connected",
        "pubsub": "connected",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", 8001)),
        reload=True,
    )
