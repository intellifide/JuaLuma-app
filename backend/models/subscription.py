"""Subscription model definition."""

# Updated 2025-12-08 17:37 CST by ChatGPT

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    plan: Mapped[str] = mapped_column(String(32), nullable=False, default="free")
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    renew_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ai_quota_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    welcome_email_sent: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="subscriptions", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"Subscription(id={self.id!r}, uid={self.uid!r}, plan={self.plan!r})"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "plan": self.plan,
            "status": self.status,
            "renew_at": self.renew_at.isoformat() if self.renew_at else None,
            "ai_quota_used": self.ai_quota_used,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


__all__ = ["Subscription"]
