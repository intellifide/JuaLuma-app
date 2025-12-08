"""Developer model definition."""

# Updated 2025-12-08 17:37 CST by ChatGPT

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Developer(Base):
    __tablename__ = "developers"

    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), primary_key=True
    )
    payout_method: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    payout_frequency: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
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
        return f"Developer(uid={self.uid!r}, payout_frequency={self.payout_frequency!r})"


__all__ = ["Developer"]
