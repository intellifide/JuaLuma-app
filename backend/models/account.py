"""Account model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User
    from .transaction import Transaction
    from .ledger import LedgerHotFree, LedgerHotEssential


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    account_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    account_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    account_number_masked: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )
    balance: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True, default=0
    )
    currency: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)
    secret_ref: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="accounts", lazy="selectin")
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account", cascade="all, delete-orphan", lazy="selectin"
    )

    ledger_hot_free: Mapped[list["LedgerHotFree"]] = relationship(
        "LedgerHotFree", back_populates="account", cascade="all, delete-orphan", lazy="selectin"
    )
    ledger_hot_essential: Mapped[list["LedgerHotEssential"]] = relationship(
        "LedgerHotEssential", back_populates="account", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"Account(id={self.id!r}, uid={self.uid!r}, "
            f"provider={self.provider!r}, account_type={self.account_type!r})"
        )


__all__ = ["Account"]
