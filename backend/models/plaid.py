"""Plaid item-centric models for webhook-driven sync."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .account import Account
    from .user import User


class PlaidItem(Base):
    __tablename__ = "plaid_items"
    __table_args__ = (
        UniqueConstraint("item_id", name="uq_plaid_items_item_id"),
        Index("idx_plaid_items_uid_status", "uid", "sync_status"),
        Index("idx_plaid_items_sync_needed", "sync_needed_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    item_id: Mapped[str] = mapped_column(String(128), nullable=False)
    institution_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    secret_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    next_cursor: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sync_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="active", server_default="active"
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sync_needed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_webhook_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    reauth_needed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cleanup_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    removed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    user: Mapped[User] = relationship("User", lazy="selectin")
    account_links: Mapped[list[PlaidItemAccount]] = relationship(
        "PlaidItemAccount",
        back_populates="plaid_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "item_id": self.item_id,
            "institution_name": self.institution_name,
            "sync_status": self.sync_status,
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "sync_needed_at": self.sync_needed_at.isoformat() if self.sync_needed_at else None,
            "last_webhook_at": self.last_webhook_at.isoformat() if self.last_webhook_at else None,
            "reauth_needed_at": self.reauth_needed_at.isoformat() if self.reauth_needed_at else None,
            "is_active": self.is_active,
            "removed_at": self.removed_at.isoformat() if self.removed_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class PlaidItemAccount(Base):
    __tablename__ = "plaid_item_accounts"
    __table_args__ = (
        UniqueConstraint(
            "plaid_item_id", "account_id", name="uq_plaid_item_accounts_item_account"
        ),
        UniqueConstraint(
            "uid", "plaid_account_id", name="uq_plaid_item_accounts_uid_plaid_account_id"
        ),
        Index("idx_plaid_item_accounts_account", "account_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    plaid_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    plaid_account_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    plaid_item: Mapped[PlaidItem] = relationship(
        "PlaidItem", back_populates="account_links", lazy="selectin"
    )
    account: Mapped[Account] = relationship(
        "Account", back_populates="plaid_item_accounts", lazy="selectin"
    )


class PlaidWebhookEvent(Base):
    __tablename__ = "plaid_webhook_events"
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_plaid_webhook_events_dedupe_key"),
        Index("idx_plaid_webhook_events_item", "item_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    webhook_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    webhook_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(128), nullable=False)
    signature_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


__all__ = ["PlaidItem", "PlaidItemAccount", "PlaidWebhookEvent"]
