"""Payment model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True
    )
    stripe_sub_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
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
        "User", back_populates="payments", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"Payment(id={self.id!r}, uid={self.uid!r}, "
            f"stripe_customer_id={self.stripe_customer_id!r})"
        )


__all__ = ["Payment"]
