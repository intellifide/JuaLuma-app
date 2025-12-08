"""AISettings model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class AISettings(Base):
    __tablename__ = "ai_settings"
    __table_args__ = (UniqueConstraint("uid", name="uq_ai_settings_uid"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(
        String(32), nullable=False, default="vertex-ai"
    )
    model_id: Mapped[str] = mapped_column(
        String(64), nullable=False, default="gemini-2.5-flash"
    )
    user_dek_ref: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
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
        "User", back_populates="ai_settings", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"AISettings(id={self.id!r}, uid={self.uid!r}, "
            f"provider={self.provider!r}, model_id={self.model_id!r})"
        )


__all__ = ["AISettings"]
