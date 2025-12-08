"""Transaction model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, desc, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_transactions_uid_ts_desc", "uid", desc("ts")),
        Index("idx_transactions_uid_category", "uid", "category"),
        Index("idx_transactions_account_id", "account_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    merchant_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    embedding: Mapped[Optional[Vector]] = mapped_column(Vector(768), nullable=True)
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
        "User", back_populates="transactions", lazy="selectin"
    )
    account: Mapped["Account"] = relationship(
        "Account", back_populates="transactions", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"Transaction(id={self.id!r}, uid={self.uid!r}, "
            f"account_id={self.account_id!r}, amount={self.amount!r}, "
            f"currency={self.currency!r})"
        )


__all__ = ["Transaction"]
