import logging
import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from backend.middleware.auth import (
    get_current_user,
    require_support_agent,
)
from backend.models import LocalNotification, User
from backend.models.support import (
    SupportAgent,
    SupportTicket,
    SupportTicketMessage,
    SupportTicketRating,
)
from backend.core.events import publish_event
from backend.utils import get_db

router = APIRouter(prefix="/api/support", tags=["support"])
logger = logging.getLogger(__name__)


# --- Schemas ---

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=256)
    description: str = Field(..., min_length=10)
    category: Literal["account", "billing", "technical", "feature_request"]


class TicketUpdate(BaseModel):
    status: Optional[Literal["open", "resolved", "closed"]] = None


class TicketMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)


class TicketMessageResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    sender_type: Literal["user", "support"]
    sender_id: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: uuid.UUID
    user_id: str
    subject: str
    description: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime
    messages: List[TicketMessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class TicketRatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None


class TicketRatingResponse(BaseModel):
    id: uuid.UUID
    ticket_id: str
    agent_id: uuid.UUID
    customer_uid: str
    rating: int
    feedback_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Helpers ---


def _get_ticket_for_actor(
    db: Session, ticket_id: uuid.UUID, current_user: User
) -> Optional[SupportTicket]:
    """Fetch a ticket scoped by role."""
    query = (
        db.query(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .filter(SupportTicket.id == ticket_id)
    )

    if current_user.role not in {"support_agent", "support_manager"}:
        query = query.filter(SupportTicket.user_id == current_user.uid)

    return query.first()


from backend.services.notifications import NotificationService

def _create_resolution_notification_if_needed(
    db: Session, ticket: SupportTicket
) -> Optional[LocalNotification]:
    """Idempotently record a local notification for ticket resolution."""
    # Use the new service
    service = NotificationService(db)
    
    # Check for existing idempotent key
    existing = (
        db.query(LocalNotification)
        .filter(
            LocalNotification.uid == ticket.user_id,
            LocalNotification.ticket_id == ticket.id,
            LocalNotification.event_key == "ticket_resolved",
        )
        .first()
    )
    if existing:
        return existing

    # Create via service (handles email + DB)
    user = db.query(User).filter(User.uid == ticket.user_id).first()
    if not user:
        return None
        
    return service.create_notification(
        user=user,
        title="Ticket Resolved",
        message=f"Your ticket '{ticket.subject}' has been resolved.",
        send_email=True
    )




# --- Endpoints ---


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new support ticket."""
    ticket = SupportTicket(
        user_id=current_user.uid,
        subject=payload.subject,
        description=payload.description,
        category=payload.category,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Publish 'ticket_created' event to Pub/Sub
    try:
        publish_event(
            topic_id="ticket_events",
            data={
                "event_type": "ticket_created",
                "ticket_id": str(ticket.id),
                "user_id": current_user.uid,
                "subject": ticket.subject,
                "category": ticket.category,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            attributes={"event_type": "ticket_created"},
        )
    except Exception as e:
        logger.error(f"Failed to publish ticket_created event: {e}")

    logger.info(f"Ticket created: {ticket.id} by user {current_user.uid}")

    return ticket


@router.get("/tickets", response_model=List[TicketResponse])
def get_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tickets for the authenticated user."""
    tickets = (
        db.query(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .filter(SupportTicket.user_id == current_user.uid)
        .order_by(desc(SupportTicket.updated_at))
        .all()
    )
    return tickets


@router.get(
    "/agent/tickets",
    response_model=List[TicketResponse],
    dependencies=[Depends(require_support_agent)],
)
def get_tickets_for_support(
    customer_uid: Optional[str] = Query(
        None, description="Optional customer uid filter"
    ),
    db: Session = Depends(get_db),
):
    """List tickets for support agents/managers, optionally filtered by customer."""
    query = (
        db.query(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .order_by(desc(SupportTicket.updated_at))
    )
    if customer_uid:
        query = query.filter(SupportTicket.user_id == customer_uid)

    tickets = query.all()
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket_detail(
    ticket_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get details of a specific ticket."""
    ticket = (
        db.query(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .filter(SupportTicket.id == ticket_id, SupportTicket.user_id == current_user.uid)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket_status(
    payload: TicketUpdate,
    ticket_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update ticket status (user scoped; agents/managers can update any ticket)."""
    if payload.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="status is required"
        )

    ticket = _get_ticket_for_actor(db=db, ticket_id=ticket_id, current_user=current_user)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    old_status = ticket.status
    notification: Optional[LocalNotification] = None

    if payload.status != ticket.status:
        ticket.status = payload.status
        ticket.updated_at = datetime.now(timezone.utc)

        if old_status == "open" and payload.status == "resolved":
            notification = _create_resolution_notification_if_needed(db, ticket)

        db.commit()
        db.refresh(ticket)

        if notification:
            db.refresh(notification)
    else:
        logger.info("No status change for ticket %s", ticket.id)

    return ticket


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse)
def add_message(
    payload: TicketMessageCreate,
    ticket_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a message to a ticket (reply)."""
    ticket = _get_ticket_for_actor(db=db, ticket_id=ticket_id, current_user=current_user)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    # If ticket was resolved/closed, re-open it?
    # Usually if user replies, we re-open if it was waiting or resolved, but maybe not if closed.
    # For now, let's auto-open if it's not closed.
    if ticket.status == "resolved":
        ticket.status = "open"

    message = SupportTicketMessage(
        ticket_id=ticket.id,
        sender_type="support"
        if current_user.role in {"support_agent", "support_manager"}
        else "user",
        sender_id=current_user.uid,
        message=payload.message,
    )
    db.add(message)
    ticket.updated_at = datetime.now(timezone.utc)  # Force update updated_at
    db.commit()
    db.refresh(message)

    # Publish 'ticket_updated' event
    try:
        publish_event(
            topic_id="ticket_events",
            data={
                "event_type": "ticket_updated",
                "ticket_id": str(ticket.id),
                "user_id": current_user.uid,
                "message_id": str(message.id),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            attributes={"event_type": "ticket_updated"},
        )
    except Exception as e:
        logger.error(f"Failed to publish ticket_updated event: {e}")

    # Notify user if agent replied (outside event try/catch to ensure it runs even if event bus fails, or wrap in its own try)
    try:
        if message.sender_type == "support":
             user_to_notify = db.query(User).filter(User.uid == ticket.user_id).first()
             if user_to_notify:
                 NotificationService(db).create_notification(
                     user=user_to_notify,
                     title="New Support Message",
                     message=f"Agent replied to ticket '{ticket.subject}'.",
                     send_email=True
                 )
    except Exception as e:
        logger.error(f"Failed to notify user of reply: {e}")

    logger.info(f"Message added to ticket {ticket.id} by user {current_user.uid}")

    return message


@router.post("/tickets/{ticket_id}/close", response_model=TicketResponse)
def close_ticket(
    ticket_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close a ticket."""
    ticket = _get_ticket_for_actor(db=db, ticket_id=ticket_id, current_user=current_user)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    ticket.status = "closed"
    db.commit()
    db.refresh(ticket)
    
    # Publish 'ticket_closed' event
    try:
        publish_event(
            topic_id="ticket_events",
            data={
                "event_type": "ticket_closed",
                "ticket_id": str(ticket.id),
                "user_id": current_user.uid,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            attributes={"event_type": "ticket_closed"},
        )
    except Exception as e:
        logger.error(f"Failed to publish ticket_closed event: {e}")

    return ticket


@router.post("/tickets/{ticket_id}/rate", response_model=TicketRatingResponse)
def rate_ticket(
    payload: TicketRatingCreate,
    ticket_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate a support ticket."""
    # Ensure ticket exists and belongs to user
    ticket = (
        db.query(SupportTicket)
        .filter(SupportTicket.id == ticket_id, SupportTicket.user_id == current_user.uid)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    # 2025-12-11 14:08 CST - normalize ticket_id handling for legacy string column
    ticket_id_str = str(ticket.id)

    # Check if already rated
    existing_rating = (
        db.query(SupportTicketRating)
        .filter(SupportTicketRating.ticket_id == ticket_id_str)  # Legacy string ID
        .first()
    )
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ticket already rated"
        )

    # 2025-12-11 01:40 CST - persist rating with a fallback system agent
    agent = (
        db.query(SupportAgent)
        .filter(SupportAgent.active.is_(True))
        .order_by(SupportAgent.created_at.asc())
        .first()
    )

    if not agent:
        agent = SupportAgent(
            company_id="system",
            name="System Agent",
            email="system@finity.support",
            role="support_agent",
            active=True,
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

    rating_record = SupportTicketRating(
        ticket_id=ticket_id_str,
        agent_id=agent.id,
        customer_uid=current_user.uid,
        rating=payload.rating,
        feedback_text=payload.feedback_text,
    )
    db.add(rating_record)
    db.commit()
    db.refresh(rating_record)

    return rating_record
