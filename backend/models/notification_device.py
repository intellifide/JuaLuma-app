"""Core Purpose: Persist push notification device registrations."""

# Last Updated: 2026-01-23 22:39 CST

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class NotificationDevice(Base):
    """Store registered push notification devices per user."""

    __tablename__ = "notification_devices"
    __table_args__ = (
        UniqueConstraint("uid", "device_token", name="uq_notification_device"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    device_token: Mapped[str] = mapped_column(String(256), nullable=False)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
        "User", back_populates="notification_devices", lazy="selectin"
    )

    def to_dict(self) -> dict[str, str | bool | None]:
        """Serialize device registration to a JSON-friendly dict."""
        return {
            "id": str(self.id),
            "device_token": self.device_token,
            "platform": self.platform,
            "is_active": self.is_active,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }


__all__ = ["NotificationDevice"]
