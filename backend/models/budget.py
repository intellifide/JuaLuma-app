"""Core Purpose: Persist budget targets and alert triggers."""

# Last Updated: 2026-01-23 23:05 CST

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    period: Mapped[str] = mapped_column(String(16), default="monthly", nullable=False)
    alert_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    alert_threshold_percent: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.8, server_default="0.8"
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

    user: Mapped["User"] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"Budget(uid={self.uid!r}, category={self.category!r}, amount={self.amount!r})"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "category": self.category,
            "amount": float(self.amount),
            "period": self.period,
            "alert_enabled": self.alert_enabled,
            "alert_threshold_percent": float(self.alert_threshold_percent),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


__all__ = ["Budget"]
