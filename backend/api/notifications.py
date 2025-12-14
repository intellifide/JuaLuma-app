from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from pydantic import BaseModel
from typing import List
import uuid

from backend.utils import get_db
from backend.middleware.auth import get_current_user
from backend.models import User, LocalNotification
from backend.services.notifications import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str # Payload is safe to send via TLS API
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List notifications for the current user."""
    query = db.query(LocalNotification).filter(LocalNotification.uid == current_user.uid)
    
    if unread_only:
        query = query.filter(LocalNotification.is_read == False)
        
    return query.order_by(desc(LocalNotification.created_at)).limit(50).all()

@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    service = NotificationService(db)
    service.mark_as_read(str(notification_id), current_user.uid)
    return None
