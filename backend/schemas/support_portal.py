from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AgentReplyRequest(BaseModel):
    message: str
    internal_note: bool = False


class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed


class TicketResponse(BaseModel):
    id: UUID
    customer_uid: str
    subject: str
    Status: str  # Keeping db column name case for now, should normalize later if possible or use alias
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketDetailResponse(TicketResponse):
    description: str
    messages: list[dict]  # Simplified for now, or use Message schema if available
