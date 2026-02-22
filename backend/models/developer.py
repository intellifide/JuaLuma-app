"""Developer model definition."""

# Updated 2025-12-08 17:37 CST by ChatGPT

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Developer(Base):
    __tablename__ = "developers"

    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), primary_key=True
    )
    payout_method: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    payout_frequency: Mapped[str | None] = mapped_column(String(32), nullable=True)
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
        "User", back_populates="developer", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"Developer(uid={self.uid!r}, payout_frequency={self.payout_frequency!r})"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "uid": self.uid,
            "payout_method": self.payout_method,
            "payout_frequency": self.payout_frequency,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


__all__ = ["Developer"]
