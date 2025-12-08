"""Subscription model definition."""

# Updated 2025-12-08 17:37 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    plan: Mapped[str] = mapped_column(String(32), nullable=False, default="free")
    status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    renew_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ai_quota_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
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
        "User", back_populates="subscriptions", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"Subscription(id={self.id!r}, uid={self.uid!r}, plan={self.plan!r})"


__all__ = ["Subscription"]
