# backend/api/widgets.py
import logging
import time
from collections import defaultdict, deque
from datetime import UTC, datetime
from threading import Lock
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from backend.core.dependencies import (
    get_current_active_subscription,
    require_developer,
)
from backend.middleware.auth import get_current_user
from backend.models import AuditLog, User, Widget, WidgetRating
from backend.services.access_control.registry import can_use_feature
from backend.utils import get_db

# Updated 2025-12-10 15:10 CST by ChatGPT
# 2025-12-11 17:23 CST - add widget run event logging endpoint

router = APIRouter(prefix="/api/widgets", tags=["widgets"])
logger = logging.getLogger(__name__)

# --- Schemas ---


class WidgetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: str | None = Field(None, max_length=1024)
    category: str | None = Field("general", max_length=64)
    scopes: list[str] = Field(default_factory=list)
    preview_data: dict[str, Any] = Field(default_factory=dict)

    @field_validator("scopes")
    def validate_scopes(cls, v: list[str]) -> list[str]:
        """Ensure scopes are read-only."""
        for scope in v:
            if (
                "write" in scope.lower()
                or "delete" in scope.lower()
                or "update" in scope.lower()
            ):
                raise ValueError(
                    f"Scope '{scope}' is not allowed. Only read-only scopes are permitted."
                )
        return v


class WidgetCreate(WidgetBase):
    pass


class WidgetUpdate(BaseModel):
    description: str | None = Field(None, max_length=1024)
    category: str | None = Field(None, max_length=64)
    version: str | None = Field(None, pattern=r"^\d+\.\d+\.\d+$")
    preview_data: dict[str, Any] | None = None


class WidgetResponse(WidgetBase):
    id: str
    developer_uid: str
    version: str
    status: str
    downloads: int
    rating_avg: float
    rating_count: int
    created_at: datetime
    updated_at: datetime


    model_config = ConfigDict(from_attributes=True)


class WidgetRatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: str | None = Field(None, max_length=2000)


class PaginatedWidgetResponse(BaseModel):
    data: list[WidgetResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)


# --- Endpoints ---

# Simple in-memory rate limiter for submissions
_submit_attempts: dict[str, deque[float]] = defaultdict(deque)
_submit_lock = Lock()
_SUBMIT_WINDOW = 3600  # 1 hour
_SUBMIT_LIMIT = 5


def _check_submit_rate_limit(uid: str) -> None:
    now = time.time()
    with _submit_lock:
        attempts = _submit_attempts[uid]
        # Cleanup old attempts
        while attempts and attempts[0] <= now - _SUBMIT_WINDOW:
            attempts.popleft()

        if len(attempts) >= _SUBMIT_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded for widget submissions. Please try again in an hour.",
            )
        attempts.append(now)


@router.get("/", response_model=PaginatedWidgetResponse)
def list_widgets(
    category: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List available widgets with optional filtering and pagination."""
    query = db.query(Widget).filter(Widget.status == "approved")

    if category:
        query = query.filter(Widget.category == category)
    if search:
        # Simple case-insensitive search on name
        query = query.filter(Widget.name.ilike(f"%{search}%"))

    total = query.count()
    widgets = query.offset((page - 1) * page_size).limit(page_size).all()

    return {"data": widgets, "total": total, "page": page, "page_size": page_size}


@router.get("/mine", response_model=list[WidgetResponse])
def list_my_widgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Widget]:
    """List widgets owned by the current user."""
    return db.query(Widget).filter(Widget.developer_uid == current_user.uid).all()


@router.post(
    "/submit", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED
)
def submit_widget(
    payload: WidgetCreate,
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db),
) -> Widget:
    """Submit a new widget for review. Developer only. (Legacy/Simple)"""
    # Developer check handled by dependency

    _check_submit_rate_limit(current_user.uid)

    widget = Widget(
        developer_uid=current_user.uid,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        scopes=payload.scopes,
        preview_data=payload.preview_data,
        status="pending",
    )

    db.add(widget)
    db.commit()
    db.refresh(widget)

    return widget


@router.post("/", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreate,
    request: Request,
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db),
) -> Widget:
    """Create a new widget. Requires Developer Agreement."""
    # Dependencies handle auth checks

    _check_submit_rate_limit(current_user.uid)

    # 3. Create Widget
    widget = Widget(
        developer_uid=current_user.uid,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        scopes=payload.scopes,
        preview_data=payload.preview_data,
        status="pending_review",
    )
    db.add(widget)

    # 4. Audit Log

    from backend.models import AuditLog  # Deferred import to avoid circular if any

    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id,
        "widget_name": widget.name,
        "user_agent": request.headers.get("user-agent"),
    }

    # We need to flush widget to get ID for audit? UUID is generated in app or DB?
    # Model says: default=lambda: str(uuid.uuid4()). It's client-side generated in python.
    # But usually we need to flush to be safe if DB triggers modify it.
    db.flush()

    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="create_widget",
        source="backend",
        metadata_json=metadata,
    )
    db.add(log_entry)

    db.commit()
    db.refresh(widget)

    return widget


@router.patch("/{widget_id}", response_model=WidgetResponse)
def update_widget(
    widget_id: str,
    payload: WidgetUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Widget:
    """Update a widget. Owner only."""
    widget = (
        db.query(Widget)
        .filter(Widget.id == widget_id, Widget.developer_uid == current_user.uid)
        .first()
    )
    if not widget:
        raise HTTPException(
            status_code=404, detail="The specified widget could not be found."
        )

    updated = False
    if payload.description is not None:
        widget.description = payload.description
        updated = True
    if payload.category is not None:
        widget.category = payload.category
        updated = True
    if payload.preview_data is not None:
        widget.preview_data = payload.preview_data
        updated = True

    # If version changes, reset to pending_review
    if payload.version is not None and payload.version != widget.version:
        widget.version = payload.version
        widget.status = "pending_review"
        updated = True

    if updated:
        metadata = {
            "ip": request.client.host if request.client else None,
            "widget_id": widget.id,
            "updates": payload.model_dump(exclude_unset=True),
        }
        log_entry = AuditLog(
            actor_uid=current_user.uid,
            target_uid=widget.developer_uid,
            action="update_widget",
            source="backend",
            metadata_json=metadata,
        )
        db.add(log_entry)

        db.commit()
        db.refresh(widget)

    return widget


@router.delete("/{widget_id}")
def delete_widget(
    widget_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Soft delete a widget. Owner only."""
    widget = (
        db.query(Widget)
        .filter(Widget.id == widget_id, Widget.developer_uid == current_user.uid)
        .first()
    )
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    widget.status = "removed"

    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id,
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="delete_widget",
        source="backend",
        metadata_json=metadata,
    )
    db.add(log_entry)

    db.commit()
    return {"message": "Widget removed"}


@router.post("/{widget_id}/download")
def download_widget(
    widget_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Download a widget. Increments download count."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.status != "approved" and widget.developer_uid != current_user.uid:
        # Only owner can download non-approved widgets
        raise HTTPException(status_code=404, detail="This widget is not currently available.")

    # Enforce registry-backed tier requirement for downloading
    sub = get_current_active_subscription(current_user)
    has_access = can_use_feature("marketplace.preview", sub.plan if sub else None)

    if not has_access and widget.developer_uid != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Ultimate subscription required to download widgets.",
        )

    # Increment downloads
    widget.downloads += 1

    # Audit
    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id,
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="download_widget",
        source="backend",
        metadata_json=metadata,
    )
    db.add(log_entry)

    # Firestore: Widget Engagement
    try:
        from firebase_admin import firestore  # type: ignore

        from backend.utils.firestore import get_firestore_client

        db_fs = get_firestore_client()
        today = datetime.now(UTC).strftime("%Y-%m-%d")

        # Structure: widget_engagement/{widget_id}/daily/{date}
        doc_ref = (
            db_fs.collection("widget_engagement")
            .document(widget.id)
            .collection("daily")
            .document(today)
        )

        # Atomic Increment
        if not doc_ref.get().exists:
            doc_ref.set({"downloads": 1, "date": today})
        else:
            doc_ref.update({"downloads": firestore.Increment(1)})

    except Exception as e:
        # Don't fail the download if metrics fail, just log it
        logger.error(f"Failed to record widget engagement stats: {e}")

    db.commit()
    db.refresh(widget)

    # Return Manifest JSON
    manifest = {
        "id": widget.id,
        "name": widget.name,
        "description": widget.description,
        "version": widget.version,
        "category": widget.category,
        "scopes": widget.scopes,
        "developer_id": widget.developer_uid,
        "generated_at": datetime.now(UTC).isoformat(),
    }

    return manifest


@router.post("/{widget_id}/run")
def record_widget_run(
    widget_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Log a widget execution to the audit log for payout calculations."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.status != "approved" and widget.developer_uid != current_user.uid:
        raise HTTPException(status_code=404, detail="Widget not found or not available")

    metadata = {
        "widget_id": widget.id,
        "developer_uid": widget.developer_uid,
        "runner_uid": current_user.uid,
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }

    db.add(
        AuditLog(
            actor_uid=current_user.uid,
            target_uid=widget.developer_uid,
            action="widget_run",
            source="backend",
            metadata_json=metadata,
        )
    )
    db.commit()

    return {"message": "Widget run recorded"}


@router.post("/{widget_id}/rate")
def rate_widget(
    widget_id: str,
    payload: WidgetRatingCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Rate a widget. 1-5 stars."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.developer_uid == current_user.uid:
        raise HTTPException(
            status_code=400, detail="You cannot leave a rating for your own widget."
        )

    # Check existing rating
    existing = (
        db.query(WidgetRating)
        .filter(
            WidgetRating.widget_id == widget_id,
            WidgetRating.user_uid == current_user.uid,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="You have already submitted a rating for this widget."
        )

    rating = WidgetRating(
        widget_id=widget_id,
        user_uid=current_user.uid,
        rating=payload.rating,
        review=payload.review,
    )
    db.add(rating)

    # Update aggregates
    old_total = widget.rating_avg * widget.rating_count
    widget.rating_count += 1
    widget.rating_avg = (old_total + payload.rating) / widget.rating_count

    # Audit
    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id,
        "rating": payload.rating,
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="rate_widget",
        source="backend",
        metadata_json=metadata,
    )
    db.add(log_entry)

    db.commit()
    return {"message": "Rating submitted"}
