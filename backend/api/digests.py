"""Core Purpose: Manage user-configurable financial digest scheduling and history."""

# Last Updated: 2026-02-03 00:00 CST

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core import settings
from backend.middleware.auth import get_current_user
from backend.models import User
from backend.services.digests import (
    ensure_digest_settings,
    list_digest_threads,
    load_digest_thread_messages,
    run_digest_now,
    update_digest_settings,
)
from backend.utils import get_db

router = APIRouter(prefix="/api/digests", tags=["digests"])


class DigestSettingsResponse(BaseModel):
    enabled: bool
    cadence: str
    weekly_day_of_week: int
    day_of_month: int
    send_time_local: str
    delivery_in_app: bool
    delivery_email: bool
    thread_id: str
    next_send_at_utc: str | None = None
    last_sent_at_utc: str | None = None


class DigestSettingsUpdateRequest(BaseModel):
    enabled: bool | None = None
    cadence: str | None = Field(default=None, description="weekly|monthly|quarterly|annually")
    weekly_day_of_week: int | None = Field(default=None, description="0 (Mon) .. 6 (Sun); used for weekly cadence")
    day_of_month: int | None = Field(default=None, description="1..28; used for monthly/quarterly/annually cadence")
    send_time_local: str | None = Field(default=None, description="HH:MM (24h)")
    delivery_in_app: bool | None = None
    delivery_email: bool | None = None


class DigestThreadItem(BaseModel):
    thread_id: str
    title: str
    preview: str
    timestamp: str


class DigestThreadsResponse(BaseModel):
    threads: list[DigestThreadItem]


class DigestThreadMessagesResponse(BaseModel):
    thread_id: str
    title: str
    messages: list[dict[str, str]]


@router.get("/settings", response_model=DigestSettingsResponse)
def get_digest_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = ensure_digest_settings(db, current_user)
    return DigestSettingsResponse(**settings.to_dict())


@router.patch("/settings", response_model=DigestSettingsResponse)
def patch_digest_settings(
    payload: DigestSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = update_digest_settings(db, current_user, payload.model_dump(exclude_unset=True))
    return DigestSettingsResponse(**settings.to_dict())


@router.get("/threads", response_model=DigestThreadsResponse)
def get_digest_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    threads = list_digest_threads(db, current_user.uid)
    return DigestThreadsResponse(
        threads=[
            DigestThreadItem(
                thread_id=str(item["thread_id"]),
                title=item["title"],
                preview=item["preview"],
                timestamp=item["timestamp"],
            )
            for item in threads
        ]
    )


@router.get("/threads/{thread_id}", response_model=DigestThreadMessagesResponse)
def get_digest_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = load_digest_thread_messages(db, current_user.uid, thread_id)
    return DigestThreadMessagesResponse(**data)


@router.post("/run-now")
def run_digest_now_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if settings.app_env.lower() not in {"local", "test"}:
        raise HTTPException(status_code=403, detail="run-now is only available in local/test environments.")
    sent = run_digest_now(db, current_user.uid)
    return {"status": "ok", "generated": sent}
