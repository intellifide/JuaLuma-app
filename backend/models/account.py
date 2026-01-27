"""Account model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .ledger import LedgerHotEssential, LedgerHotFree
    from .transaction import Transaction
    from .user import User


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    account_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    account_number_masked: Mapped[str | None] = mapped_column(String(32), nullable=True)
    plaid_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    plaid_subtype: Mapped[str | None] = mapped_column(String(64), nullable=True)
    balance: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True, default=0
    )
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    assigned_member_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    custom_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    secret_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    plaid_next_cursor: Mapped[str | None] = mapped_column(String(512), nullable=True)
    web3_sync_cursor: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    web3_sync_chain: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sync_status: Mapped[str | None] = mapped_column(
        String(32), nullable=True, default="active"
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
        "User", back_populates="accounts", lazy="selectin"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    ledger_hot_free: Mapped[list["LedgerHotFree"]] = relationship(
        "LedgerHotFree",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    ledger_hot_essential: Mapped[list["LedgerHotEssential"]] = relationship(
        "LedgerHotEssential",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"Account(id={self.id!r}, uid={self.uid!r}, "
            f"provider={self.provider!r}, account_type={self.account_type!r})"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "account_type": self.account_type,
            "provider": self.provider,
            "account_name": self.account_name,
            "account_number_masked": self.account_number_masked,
            "plaid_type": self.plaid_type,
            "plaid_subtype": self.plaid_subtype,
            "balance": float(self.balance) if self.balance is not None else None,
            "currency": self.currency,
            "assigned_member_uid": self.assigned_member_uid,
            "custom_label": self.custom_label,
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "web3_sync_cursor": self.web3_sync_cursor,
            "web3_sync_chain": self.web3_sync_chain,
            "sync_status": self.sync_status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }



__all__ = ["Account"]
