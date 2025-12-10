"""User model definition."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, String
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .account import Account
    from .transaction import Transaction
    from .subscription import Subscription
    from .payment import Payment
    from .ai_settings import AISettings
    from .notification import NotificationPreference
    from .manual_asset import ManualAsset
    from .payout import DeveloperPayout
    from .developer import Developer


class User(Base):
    __tablename__ = "users"

    uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="user")
    theme_pref: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    currency_pref: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)
    developer_payout_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
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

    developer: Mapped[Optional["Developer"]] = relationship(
        "Developer", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    accounts: Mapped[list["Account"]] = relationship(
        "Account",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    ai_settings: Mapped[Optional["AISettings"]] = relationship(
        "AISettings",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(
        "NotificationPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    manual_assets: Mapped[list["ManualAsset"]] = relationship(
        "ManualAsset",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    developer_payouts: Mapped[list["DeveloperPayout"]] = relationship(
        "DeveloperPayout",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"User(uid={self.uid!r}, email={self.email!r}, role={self.role!r})"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "uid": self.uid,
            "email": self.email,
            "role": self.role,
            "theme_pref": self.theme_pref,
            "currency_pref": self.currency_pref,
            "developer_payout_id": str(self.developer_payout_id)
            if self.developer_payout_id
            else None,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


__all__ = ["User"]
