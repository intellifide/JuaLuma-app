"""DeveloperPayout model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class DeveloperPayout(Base):
    __tablename__ = "developer_payouts"
    __table_args__ = (UniqueConstraint("month", "dev_uid", name="uq_payout_month_dev"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)
    dev_uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    gross_revenue: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=0
    )
    payout_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending"
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
        "User", back_populates="developer_payouts", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"DeveloperPayout(id={self.id!r}, dev_uid={self.dev_uid!r}, "
            f"month={self.month!r}, status={self.payout_status!r})"
        )


__all__ = ["DeveloperPayout"]
