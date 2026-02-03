"""Core Purpose: Store global notification settings like alert thresholds."""

# Last Updated: 2026-01-23 23:05 CST

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class NotificationSettings(Base):
    """Persist global notification settings per user."""

    __tablename__ = "notification_settings"

    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), primary_key=True
    )
    low_balance_threshold: Mapped[float | None] = mapped_column(
        nullable=True, default=None
    )
    large_transaction_threshold: Mapped[float | None] = mapped_column(
        nullable=True, default=None
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
        "User", back_populates="notification_settings", lazy="selectin"
    )

    def to_dict(self) -> dict[str, object | None]:
        """Serialize settings to a JSON-friendly dict."""
        return {
            "low_balance_threshold": self.low_balance_threshold,
            "large_transaction_threshold": self.large_transaction_threshold,
        }


__all__ = ["NotificationSettings"]
