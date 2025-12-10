"""Ledger hot window models."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, desc, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User
    from .account import Account


class LedgerHotFree(Base):
    __tablename__ = "ledger_hot_free"
    __table_args__ = (
        Index("idx_ledger_hot_free_uid_ts", "uid", desc("ts")),
        Index("idx_ledger_hot_free_account", "account_id"),
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
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="selectin")
    account: Mapped["Account"] = relationship(
        "Account", back_populates="ledger_hot_free", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"LedgerHotFree(id={self.id!r}, uid={self.uid!r}, "
            f"account_id={self.account_id!r}, amount={self.amount!r})"
        )


class LedgerHotEssential(Base):
    __tablename__ = "ledger_hot_essential"
    __table_args__ = (
        Index("idx_ledger_hot_ess_uid_ts", "uid", desc("ts")),
        Index("idx_ledger_hot_ess_account", "account_id"),
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
    raw_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="selectin")
    account: Mapped["Account"] = relationship(
        "Account", back_populates="ledger_hot_essential", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"LedgerHotEssential(id={self.id!r}, uid={self.uid!r}, "
            f"account_id={self.account_id!r}, amount={self.amount!r})"
        )


__all__ = ["LedgerHotFree", "LedgerHotEssential"]
