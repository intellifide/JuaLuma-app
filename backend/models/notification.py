"""NotificationPreference model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime, time
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = (UniqueConstraint("uid", "event_key", name="uq_notification_event"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    event_key: Mapped[str] = mapped_column(String(64), nullable=False)
    channel_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    channel_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiet_hours_start: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    quiet_hours_end: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
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


__all__ = ["NotificationPreference"]
