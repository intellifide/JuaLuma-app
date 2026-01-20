"""Transaction model definition."""

# Updated 2025-12-08 21:27 CST by ChatGPT

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    desc,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .account import Account
    from .user import User


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_transactions_uid_ts_desc", "uid", desc("ts")),
        Index("idx_transactions_uid_category", "uid", "category"),
        Index("idx_transactions_account_id", "account_id"),
        Index("idx_transactions_merchant_description", "merchant_name", "description"),
        Index(
            "idx_transactions_external_id_account",
            "account_id",
            "external_id",
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    merchant_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    embedding: Mapped[Vector | None] = mapped_column(Vector(768), nullable=True)
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

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "account_id": str(self.account_id),
            "ts": self.ts.isoformat(),
            "amount": float(self.amount),
            "currency": self.currency,
            "category": self.category,
            "merchant_name": self.merchant_name,
            "description": self.description,
            "external_id": self.external_id,
            "is_manual": self.is_manual,
            "archived": self.archived,
            "raw_json": self.raw_json,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


__all__ = ["Transaction"]
