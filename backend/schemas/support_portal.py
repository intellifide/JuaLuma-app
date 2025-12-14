from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class AgentReplyRequest(BaseModel):
    message: str
    internal_note: bool = False

class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed

class TicketResponse(BaseModel):
    id: UUID
    customer_uid: str
    subject: str
    Status: str # Keeping db column name case for now, should normalize later if possible or use alias
    Priority: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TicketDetailResponse(TicketResponse):
    description: str
    messages: List[dict] # Simplified for now, or use Message schema if available
