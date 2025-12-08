"""Support models."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Optional

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

from . import Base


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


__all__ = ["SupportAgent", "SupportTicketRating"]
