# backend/api/widgets.py
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import AuditLog, User, Widget, WidgetRating
from backend.utils import get_db

# Updated 2025-12-10 15:10 CST by ChatGPT

router = APIRouter(prefix="/api/widgets", tags=["widgets"])
logger = logging.getLogger(__name__)

# --- Schemas ---

class WidgetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: Optional[str] = Field(None, max_length=1024)
    category: Optional[str] = Field("general", max_length=64)
    scopes: List[str] = Field(default_factory=list)
    preview_data: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("scopes")
    def validate_scopes(cls, v: List[str]) -> List[str]:
        """Ensure scopes are read-only."""
        for scope in v:
            if "write" in scope.lower() or "delete" in scope.lower() or "update" in scope.lower():
                raise ValueError(f"Scope '{scope}' is not allowed. Only read-only scopes are permitted.")
        return v

class WidgetCreate(WidgetBase):
    pass

class WidgetUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=1024)
    category: Optional[str] = Field(None, max_length=64)
    version: Optional[str] = Field(None, pattern=r"^\d+\.\d+\.\d+$")
    preview_data: Optional[Dict[str, Any]] = None

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

    class Config:
        from_attributes = True


class WidgetRatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = Field(None, max_length=2000)

# --- Endpoints ---

# Simple in-memory rate limiter for submissions
_submit_attempts: Dict[str, Deque[float]] = defaultdict(deque)
_submit_lock = Lock()
_SUBMIT_WINDOW = 3600  # 1 hour
_SUBMIT_LIMIT = 5

def _check_submit_rate_limit(uid: str):
    now = time.time()
    with _submit_lock:
        attempts = _submit_attempts[uid]
        # Cleanup old attempts
        while attempts and attempts[0] <= now - _SUBMIT_WINDOW:
            attempts.popleft()
        
        if len(attempts) >= _SUBMIT_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Submission limit reached. Try again later."
            )
        attempts.append(now)

@router.get("/", response_model=List[WidgetResponse])
def list_widgets(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List available widgets with optional filtering."""
    query = db.query(Widget).filter(Widget.status == "approved")
    
    if category:
        query = query.filter(Widget.category == category)
    if search:
        # Simple case-insensitive search on name
        query = query.filter(Widget.name.ilike(f"%{search}%"))
        
    return query.all()

@router.get("/mine", response_model=List[WidgetResponse])
def list_my_widgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List widgets owned by the current user."""
    return db.query(Widget).filter(Widget.developer_uid == current_user.uid).all()


@router.post("/submit", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
def submit_widget(
    payload: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new widget for review. Developer only. (Legacy/Simple)"""
    if not current_user.developer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer account required to submit widgets."
        )
        
    _check_submit_rate_limit(current_user.uid)
    
    widget = Widget(
        developer_uid=current_user.uid,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        scopes=payload.scopes,
        preview_data=payload.preview_data,
        status="pending"
    )
    
    db.add(widget)
    db.commit()
    db.refresh(widget)
    
    return widget

@router.post("/", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new widget. Requires Pro/Ultimate and Developer Agreement."""
    # 1. Verify Developer
    if not current_user.developer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer account/agreement required."
        )

    # 2. Verify Pro/Ultimate Tier
    active_subs = [s for s in current_user.subscriptions if s.status == "active"]
    has_pro = any(s.plan in ["pro", "ultimate"] for s in active_subs)
    
    # Allow if simple developer record exists? Task says "Require Pro/Ultimate".
    # Assuming explicit check is needed.
    if not has_pro:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Ultimate subscription required to publish widgets."
        )

    _check_submit_rate_limit(current_user.uid)

    # 3. Create Widget
    widget = Widget(
        developer_uid=current_user.uid,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        scopes=payload.scopes,
        preview_data=payload.preview_data,
        status="pending_review"
    )
    db.add(widget)
    
    # 4. Audit Log
    
    from backend.models import AuditLog # Deferred import to avoid circular if any
    
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
):
    """Update a widget. Owner only."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
        
    if widget.developer_uid != current_user.uid:
        raise HTTPException(status_code=403, detail="Not authorized to edit this widget")
        
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
            "updates": payload.model_dump(exclude_unset=True)
        }
        log_entry = AuditLog(
            actor_uid=current_user.uid,
            target_uid=widget.developer_uid,
            action="update_widget",
            source="backend",
            metadata_json=metadata
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
):
    """Soft delete a widget. Owner only."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget.developer_uid != current_user.uid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this widget")
        
    widget.status = "removed"
    
    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="delete_widget",
        source="backend",
        metadata_json=metadata
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
):
    """Download a widget. Increments download count."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
        
    if widget.status != "approved" and widget.developer_uid != current_user.uid:
         # Only owner can download non-approved widgets
         raise HTTPException(status_code=404, detail="Widget not found or not available")

    # Enforce Pro/Ultimate Subscription for downloading
    active_subs = [s for s in current_user.subscriptions if s.status == "active"]
    has_pro = any(s.plan in ["pro", "ultimate"] for s in active_subs)
    
    if not has_pro and widget.developer_uid != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Ultimate subscription required to download widgets."
        )

    # Increment downloads
    widget.downloads += 1
    
    # Audit
    metadata = {
        "ip": request.client.host if request.client else None,
        "widget_id": widget.id
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="download_widget",
        source="backend",
        metadata_json=metadata
    )
    db.add(log_entry)
    
    # TODO: Insert into widget_engagement Firestore collection as per TIER 4.7
    
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
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return manifest

@router.post("/{widget_id}/rate")
def rate_widget(
    widget_id: str,
    payload: WidgetRatingCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate a widget. 1-5 stars."""
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
        
    if widget.developer_uid == current_user.uid:
        raise HTTPException(status_code=400, detail="Developer cannot rate their own widget")
        
    # Check existing rating
    existing = db.query(WidgetRating).filter(
        WidgetRating.widget_id == widget_id,
        WidgetRating.user_uid == current_user.uid
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already rated this widget")
        
    rating = WidgetRating(
        widget_id=widget_id,
        user_uid=current_user.uid,
        rating=payload.rating,
        review=payload.review
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
        "rating": payload.rating
    }
    log_entry = AuditLog(
        actor_uid=current_user.uid,
        target_uid=widget.developer_uid,
        action="rate_widget",
        source="backend",
        metadata_json=metadata
    )
    db.add(log_entry)
    
    db.commit()
    return {"message": "Rating submitted"}



