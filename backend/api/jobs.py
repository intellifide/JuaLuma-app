"""Core Purpose: Internal job runner endpoints (Cloud Scheduler / Cloud Run style)."""

# Last Updated: 2026-02-03 00:00 CST

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException
from sqlalchemy.orm import Session

from backend.core import settings
from backend.models import SessionLocal
from backend.services.digests import run_due_digests

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _require_job_secret(secret_header: str | None) -> None:
    configured = (settings.job_runner_secret or "").strip()
    if not configured:
        # In local/dev, allow running without a secret to keep iteration fast.
        if settings.app_env.lower() in {"local", "test"}:
            return
        raise HTTPException(status_code=500, detail="JOB_RUNNER_SECRET is not configured.")

    if not secret_header or secret_header.strip() != configured:
        raise HTTPException(status_code=401, detail="Invalid job runner credentials.")


@router.post("/digests/run")
def run_digest_job(x_job_runner_secret: str | None = Header(default=None, alias="X-Job-Runner-Secret")):
    _require_job_secret(x_job_runner_secret)

    db: Session = SessionLocal()
    try:
        sent = run_due_digests(db, now_utc=datetime.now(UTC))
        return {"status": "ok", "digests_sent": sent}
    finally:
        db.close()

