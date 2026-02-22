"""Core Purpose: Persist notification preferences and in-app notifications."""

# Last Updated: 2026-01-23 22:39 CST

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
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


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = (
        UniqueConstraint("uid", "event_key", name="uq_notification_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    event_key: Mapped[str] = mapped_column(String(64), nullable=False)
    channel_email: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    channel_sms: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    channel_push: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    channel_in_app: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="notification_preferences", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"NotificationPreference(id={self.id!r}, uid={self.uid!r}, "
            f"event_key={self.event_key!r})"
        )

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-safe view of a notification preference."""
        return {
            "id": str(self.id),
            "uid": self.uid,
            "event_key": self.event_key,
            "channel_email": self.channel_email,
            "channel_sms": self.channel_sms,
            "channel_push": self.channel_push,
            "channel_in_app": self.channel_in_app,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class LocalNotification(Base):
    """Local in-app notification payloads.

    2025-12-11 14:45 CST - Adds idempotent ticket resolution alerts to satisfy
    TASK-10 without duplicating outbound channels.
    """

    __tablename__ = "local_notifications"
    __table_args__ = (
        UniqueConstraint(
            "uid",
            "ticket_id",
            "event_key",
            name="uq_local_notification_ticket_event",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    # Generic notifications don't need a ticket.
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=True,
    )
    # event_key can be a unique dedup key or generic ID
    event_key: Mapped[str | None] = mapped_column(String(64), nullable=True)

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"LocalNotification(id={self.id!r}, uid={self.uid!r}, "
            f"ticket_id={self.ticket_id!r}, event_key={self.event_key!r})"
        )

class NotificationDedupe(Base):
    """Persist dedupe keys to prevent repeat outbound notifications."""

    __tablename__ = "notification_dedupe"
    __table_args__ = (
        UniqueConstraint("uid", "dedupe_key", name="uq_notification_dedupe"),
    )

    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), primary_key=True
    )
    dedupe_key: Mapped[str] = mapped_column(String(128), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"NotificationDedupe(uid={self.uid!r}, dedupe_key={self.dedupe_key!r})"


__all__ = ["NotificationPreference", "LocalNotification", "NotificationDedupe"]
