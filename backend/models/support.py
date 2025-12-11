"""Support models."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class SupportAgent(Base):
    __tablename__ = "support_agents"
    __table_args__ = (
        CheckConstraint(
            "role IN ('support_agent', 'support_manager')", name="ck_support_role"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    ticket_ratings: Mapped[list["SupportTicketRating"]] = relationship(
        "SupportTicketRating",
        back_populates="agent",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"SupportAgent(id={self.id!r}, email={self.email!r}, role={self.role!r})"


class SupportTicketRating(Base):
    __tablename__ = "support_ticket_ratings"
    __table_args__ = (
        UniqueConstraint("ticket_id", name="uq_ticket_rating_ticket"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_ticket_rating_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[str] = mapped_column(String(128), nullable=False)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_agents.id", ondelete="CASCADE"), nullable=False
    )
    customer_uid: Mapped[str] = mapped_column(String(128), nullable=False)
    rating: Mapped[int] = mapped_column(nullable=False)
    feedback_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    agent: Mapped["SupportAgent"] = relationship(
        "SupportAgent", back_populates="ticket_ratings", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"SupportTicketRating(id={self.id!r}, ticket_id={self.ticket_id!r}, "
            f"rating={self.rating!r})"
        )


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)  # account, billing, etc.
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="open"
    )  # open, resolved, closed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    messages: Mapped[list["SupportTicketMessage"]] = relationship(
        "SupportTicketMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="SupportTicketMessage.created_at",
    )
    # 2025-12-11 14:20 CST - wire back-populates for user exports
    user: Mapped["User"] = relationship(
        "User",
        back_populates="support_tickets",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"SupportTicket(id={self.id!r}, subject={self.subject!r}, status={self.status!r})"


class SupportTicketMessage(Base):
    __tablename__ = "support_ticket_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # 'user' or 'support'
    sender_id: Mapped[str] = mapped_column(String(128), nullable=False)
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    ticket: Mapped["SupportTicket"] = relationship(
        "SupportTicket", back_populates="messages"
    )

    def __repr__(self) -> str:
        return f"SupportTicketMessage(id={self.id!r}, ticket_id={self.ticket_id!r})"


__all__ = [
    "SupportAgent",
    "SupportTicketRating",
    "SupportTicket",
    "SupportTicketMessage",
]
