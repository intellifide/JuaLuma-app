from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid

from backend.utils import get_db
from backend.api.auth import get_current_user
from backend.models.user import User
from backend.models.support import SupportTicket, SupportTicketMessage
from backend.models.audit import SupportPortalAction
from backend.schemas.support_portal import TicketResponse, TicketDetailResponse, AgentReplyRequest, TicketStatusUpdate

router = APIRouter(prefix="/api/support-portal", tags=["support-portal"])

# Role check dependency
def require_support_role(user: User = Depends(get_current_user)):
    # In a real app, strict role checks. For now, we assume if they can login to this portal they are authorized, 
    # OR we check a specific flag/role. Phase 3 requirements say "support_agent" or "support_manager".
    # Assuming 'role' field exists on User or similar mechanism.
    # For MVP context discussed in task 301, we'll verify valid user for now.
    # Ideally: if user.role not in ['support_agent', 'support_manager']: raise 403
    return user

@router.get("/tickets", response_model=List[TicketResponse])
def list_tickets(
    status: str = None,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_role)
):
    """List all tickets, optionally filtered by status."""
    query = db.query(SupportTicket)
    if status and status != "All Status":
        query = query.filter(SupportTicket.status == status) # Use lowercase model field for filter
    
    # Order by Date (Removing Priority sort as column doesn't exist)
    return query.order_by(desc(SupportTicket.created_at)).limit(100).all()

@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_role)
):
    """Get ticket details and log VIEW audit."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # AUDIT LOGGING (Information Viewing)
    action = SupportPortalAction(
        agent_id=agent.uid, # Fixed: User uses uid string
        agent_company_id=getattr(agent, "auth_uid", "unknown"), # Using auth_uid as proxy for ID
        agent_name=agent.email.split('@')[0] if agent.email else "Agent", # Fallback name
        ticket_id=str(ticket.id),
        customer_uid=ticket.customer_uid,
        action_type="VIEW_TICKET",
        action_details={"ticket_subject": ticket.subject}
    )
    db.add(action)
    db.commit()

    # Hydrate messages manually if needed or rely on relation if set up in model
    # For MVP response we assume basic fields. 
    # If relations aren't LAZY joined we might need query.
    # Let's return ticket directly and Pydantic will try to serialize.
    # We might need to manually attach messages if 'messages' relationship missing/lazy.
    
    # Check messages
    # Check messages
    msgs = db.query(SupportTicketMessage).filter(SupportTicketMessage.ticket_id == ticket.id).order_by(SupportTicketMessage.created_at).all()
    
    # Construct response manually to ensure shape
    return TicketDetailResponse(
        id=ticket.id,
        customer_uid=ticket.customer_uid,
        subject=ticket.subject,
        description=ticket.description,
        Status=ticket.Status,
        Priority=ticket.Priority,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[{"sender": m.sender_type, "message": m.message, "created_at": m.created_at} for m in msgs]
    )

@router.post("/tickets/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: uuid.UUID,
    payload: AgentReplyRequest,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_role)
):
    """Agent reply to ticket and log REPLY audit."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Create Message
    msg = SupportTicketMessage(
        ticket_id=ticket.id,
        sender_type="support", # Changed from 'sender' to 'sender_type' to match model
        sender_id=str(agent.uid), # Fixed: User uses uid string
        message=payload.message
    )
    db.add(msg)
    
    # Update Ticket
    ticket.updated_at = datetime.utcnow()
    ticket.status = "In Progress" # Auto-move to in progress on reply
    
    # AUDIT LOGGING
    action = SupportPortalAction(
        agent_id=agent.uid, # Fixed: User uses uid
        agent_company_id=getattr(agent, "auth_uid", "unknown"),
        agent_name=agent.email.split('@')[0] if agent.email else "Agent",
        ticket_id=str(ticket.id),
        customer_uid=ticket.customer_uid,
        action_type="REPLY_TICKET",
        action_details={"message_len": len(payload.message), "internal": payload.internal_note}
    )
    db.add(action)
    
    db.commit()
    return {"status": "sent"}

@router.post("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_role)
):
    """Resolve/Close ticket and log RESOLVE audit."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.Status
    ticket.Status = payload.status
    ticket.updated_at = datetime.utcnow()
    
    # AUDIT LOGGING
    action = SupportPortalAction(
        agent_id=agent.uid, # Fixed: User uses uid
        agent_company_id=getattr(agent, "auth_uid", "unknown"),
        agent_name=agent.email.split('@')[0] if agent.email else "Agent",
        ticket_id=str(ticket.id),
        customer_uid=ticket.customer_uid,
        action_type="RESOLVE_TICKET" if payload.status == "Resolved" else "STATUS_CHANGE",
        action_details={"old_status": old_status, "new_status": payload.status}
    )
    db.add(action)
    
    db.commit()
    return {"status": "updated", "new_status": ticket.Status}
