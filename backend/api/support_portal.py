import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from backend.core.config import settings
from backend.middleware.auth import require_support_agent
from backend.models.audit import SupportPortalAction
from backend.models.support import SupportTicket, SupportTicketMessage
from backend.models.user import User
from backend.schemas.support_portal import (
    AgentReplyRequest,
    AgentSummary,
    TicketAssignmentRequest,
    TicketDetailResponse,
    TicketEscalationRequest,
    TicketMessageResponse,
    TicketResponse,
    TicketStatusUpdate,
)
from backend.services.email import get_email_client
from backend.utils import get_db

router = APIRouter(prefix="/api/support-portal", tags=["support-portal"])

_EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
_PHONE_RE = re.compile(
    r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b"
)
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,19}\b")


def _redact_text(text: str | None) -> str:
    if not text:
        return ""
    redacted = text
    redacted = _EMAIL_RE.sub("[redacted-email]", redacted)
    redacted = _PHONE_RE.sub("[redacted-phone]", redacted)
    redacted = _SSN_RE.sub("[redacted-ssn]", redacted)
    redacted = _CARD_RE.sub("[redacted-card]", redacted)
    return redacted


def _mask_customer_reference(uid: str | None) -> str:
    if not uid:
        return "customer_unknown"
    if len(uid) <= 8:
        return f"customer_{uid[:4]}"
    return f"customer_{uid[:4]}_{uid[-4:]}"


def _agent_display_name(agent: User) -> str:
    if agent.first_name or agent.last_name:
        return " ".join(filter(None, [agent.first_name, agent.last_name]))
    if agent.username:
        return agent.username
    if agent.email:
        return agent.email.split("@", 1)[0]
    return "Agent"


def _resolve_queue_status(ticket: SupportTicket) -> str:
    if ticket.status in {"resolved", "closed"}:
        return ticket.status
    if ticket.escalated_to_developer:
        return "escalated"
    if ticket.assigned_agent_uid:
        return "assigned"
    return "queued"


def _serialize_ticket(ticket: SupportTicket) -> TicketResponse:
    assigned_agent = None
    if ticket.assigned_agent:
        assigned_agent = AgentSummary(
            uid=ticket.assigned_agent.uid,
            display_name=_agent_display_name(ticket.assigned_agent),
        )
    return TicketResponse(
        id=ticket.id,
        customer_reference=_mask_customer_reference(ticket.user_id),
        subject=_redact_text(ticket.subject),
        category=ticket.category,
        status=ticket.status,
        queue_status=ticket.queue_status,
        assigned_agent=assigned_agent,
        escalated_to_developer=ticket.escalated_to_developer,
        escalated_at=ticket.escalated_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _serialize_ticket_detail(ticket: SupportTicket) -> TicketDetailResponse:
    messages = [
        TicketMessageResponse(
            sender=msg.sender_type,
            message=_redact_text(msg.message),
            created_at=msg.created_at,
        )
        for msg in ticket.messages
    ]
    return TicketDetailResponse(
        **_serialize_ticket(ticket).model_dump(),
        description=_redact_text(ticket.description),
        messages=messages,
    )


def _log_action(
    *,
    db: Session,
    agent: User,
    ticket: SupportTicket,
    action_type: str,
    action_details: dict,
) -> None:
    action = SupportPortalAction(
        agent_id=agent.uid,
        agent_company_id=getattr(agent, "auth_uid", "unknown"),
        agent_name=_agent_display_name(agent),
        ticket_id=str(ticket.id),
        customer_uid=ticket.user_id,
        action_type=action_type,
        action_details=action_details,
    )
    db.add(action)


@router.get("/tickets", response_model=list[TicketResponse])
def list_tickets(
    status: str | None = None,
    queue_status: str | None = None,
    assignee: str | None = None,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """List all tickets, optionally filtered by status/queue/assignee."""
    query = db.query(SupportTicket).options(selectinload(SupportTicket.assigned_agent))

    if status and status.lower() != "all":
        query = query.filter(SupportTicket.status == status.lower().strip())

    if queue_status and queue_status.lower() != "all":
        query = query.filter(SupportTicket.queue_status == queue_status.lower().strip())

    if assignee:
        if assignee == "me":
            query = query.filter(SupportTicket.assigned_agent_uid == agent.uid)
        elif assignee == "unassigned":
            query = query.filter(SupportTicket.assigned_agent_uid.is_(None))
        else:
            query = query.filter(SupportTicket.assigned_agent_uid == assignee)

    tickets = query.order_by(desc(SupportTicket.created_at)).limit(200).all()
    return [_serialize_ticket(ticket) for ticket in tickets]


@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Get ticket details and log VIEW audit."""
    ticket = (
        db.query(SupportTicket)
        .options(
            selectinload(SupportTicket.messages),
            selectinload(SupportTicket.assigned_agent),
        )
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type="VIEW_TICKET",
        action_details={"ticket_subject": ticket.subject},
    )
    db.commit()

    return _serialize_ticket_detail(ticket)


@router.post("/tickets/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: uuid.UUID,
    payload: AgentReplyRequest,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Agent reply to ticket and log REPLY audit."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    msg = SupportTicketMessage(
        ticket_id=ticket.id,
        sender_type="support",
        sender_id=str(agent.uid),
        message=payload.message,
    )
    db.add(msg)

    if ticket.status in {"resolved", "closed"}:
        ticket.status = "open"
    if ticket.assigned_agent_uid is None:
        ticket.assigned_agent_uid = agent.uid
        ticket.assigned_at = datetime.utcnow()

    ticket.queue_status = "in_progress"
    ticket.updated_at = datetime.utcnow()

    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type="REPLY_TICKET",
        action_details={
            "message_len": len(payload.message),
            "internal": payload.internal_note,
        },
    )

    db.commit()

    try:
        get_email_client().send_support_ticket_notification(
            to_email=settings.support_email,
            subject=ticket.subject,
            ticket_id=str(ticket.id),
            user_email=f"Agent: {agent.email}",
            description=payload.message,
            event_type="Agent Reply",
        )
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error(
            "Failed to notify support of agent reply: %s", exc
        )

    return {"status": "sent"}


@router.post("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Resolve/Close ticket and log STATUS_CHANGE audit."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    normalized_status = payload.status.lower().strip()
    if normalized_status not in {"open", "resolved", "closed"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported status value.",
        )

    old_status = ticket.status
    ticket.status = normalized_status
    ticket.queue_status = _resolve_queue_status(ticket)
    ticket.updated_at = datetime.utcnow()

    action_type = "RESOLVE_TICKET" if normalized_status == "resolved" else "STATUS_CHANGE"
    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type=action_type,
        action_details={"old_status": old_status, "new_status": normalized_status},
    )

    db.commit()

    try:
        get_email_client().send_support_ticket_notification(
            to_email=settings.support_email,
            subject=ticket.subject,
            ticket_id=str(ticket.id),
            user_email=f"Agent: {agent.email}",
            description=f"Status changed from {old_status} to {normalized_status}",
            event_type="Status Updated",
        )
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error(
            "Failed to notify support of status change: %s", exc
        )

    return {"status": "updated", "new_status": ticket.status}


@router.post("/tickets/{ticket_id}/pickup")
def pickup_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Assign a ticket in the queue to the current agent."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    if ticket.assigned_agent_uid and ticket.assigned_agent_uid != agent.uid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This ticket is already assigned to another agent.",
        )

    ticket.assigned_agent_uid = agent.uid
    ticket.assigned_at = datetime.utcnow()
    ticket.queue_status = "assigned"
    ticket.updated_at = datetime.utcnow()

    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type="PICKUP_TICKET",
        action_details={"assigned_agent_uid": agent.uid},
    )

    db.commit()

    return {"status": "assigned", "assignee_uid": agent.uid}


@router.post("/tickets/{ticket_id}/assign")
def assign_ticket(
    ticket_id: uuid.UUID,
    payload: TicketAssignmentRequest,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Assign or reassign a ticket to a support agent."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    assignee_uid = payload.assignee_uid or agent.uid
    assignee = (
        db.query(User).filter(User.uid == assignee_uid, User.role.in_(["support_agent", "support_manager"])).first()
    )
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified assignee could not be found.",
        )

    ticket.assigned_agent_uid = assignee.uid
    ticket.assigned_at = datetime.utcnow()
    ticket.queue_status = "assigned"
    ticket.updated_at = datetime.utcnow()

    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type="ASSIGN_TICKET",
        action_details={"assigned_agent_uid": assignee.uid},
    )

    db.commit()

    return {"status": "assigned", "assignee_uid": assignee.uid}


@router.post("/tickets/{ticket_id}/escalate")
def escalate_ticket(
    ticket_id: uuid.UUID,
    payload: TicketEscalationRequest,
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """Escalate a technical ticket to the developer."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="The specified support ticket could not be found.",
        )

    if ticket.category != "technical":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only technical tickets can be escalated to the developer.",
        )

    ticket.escalated_to_developer = True
    ticket.escalated_at = datetime.utcnow()
    ticket.escalated_by_uid = agent.uid
    ticket.queue_status = "escalated"
    if ticket.assigned_agent_uid is None:
        ticket.assigned_agent_uid = agent.uid
        ticket.assigned_at = datetime.utcnow()
    ticket.updated_at = datetime.utcnow()

    _log_action(
        db=db,
        agent=agent,
        ticket=ticket,
        action_type="ESCALATE_TICKET",
        action_details={"note": payload.note},
    )

    db.commit()

    escalation_target = settings.developer_email or settings.support_email
    try:
        get_email_client().send_support_ticket_notification(
            to_email=escalation_target,
            subject=ticket.subject,
            ticket_id=str(ticket.id),
            user_email="Escalated from Support",
            description=payload.note or ticket.description,
            event_type="Escalated to Developer",
        )
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error(
            "Failed to notify developer of escalation: %s", exc
        )

    return {"status": "escalated"}


@router.get("/agents", response_model=list[AgentSummary])
def list_agents(
    db: Session = Depends(get_db),
    agent: User = Depends(require_support_agent),
):
    """List available support agents for assignment."""
    agents = (
        db.query(User)
        .filter(User.role.in_(["support_agent", "support_manager"]))
        .order_by(User.created_at.asc())
        .all()
    )
    return [
        AgentSummary(uid=user.uid, display_name=_agent_display_name(user))
        for user in agents
    ]
