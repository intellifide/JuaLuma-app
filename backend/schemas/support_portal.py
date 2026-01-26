from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AgentReplyRequest(BaseModel):
    message: str
    internal_note: bool = False


class TicketStatusUpdate(BaseModel):
    status: str  # open, resolved, closed


class TicketAssignmentRequest(BaseModel):
    assignee_uid: str | None = None


class TicketEscalationRequest(BaseModel):
    note: str | None = None


class AgentSummary(BaseModel):
    uid: str
    display_name: str


class TicketMessageResponse(BaseModel):
    sender: str
    message: str
    created_at: datetime


class TicketResponse(BaseModel):
    id: UUID
    customer_reference: str
    subject: str
    category: str
    status: str
    queue_status: str
    assigned_agent: AgentSummary | None = None
    escalated_to_developer: bool
    escalated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TicketDetailResponse(TicketResponse):
    description: str
    messages: list[TicketMessageResponse]
