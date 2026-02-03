"""Core Purpose: Persist user profiles and relationships."""

# Last Updated: 2026-01-23 22:39 CST

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .account import Account
    from .ai_settings import AISettings
    from .developer import Developer
    from .household import HouseholdMember
    from .legal import LegalAgreementAcceptance
    from .manual_asset import ManualAsset
    from .notification import NotificationPreference
    from .notification_device import NotificationDevice
    from .notification_settings import NotificationSettings
    from .payment import Payment
    from .payout import DeveloperPayout
    from .subscription import Subscription
    from .support import SupportTicket
    from .transaction import Transaction
    from .user_document import UserDocument


class User(Base):
    __tablename__ = "users"

    uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending_verification",
        server_default="pending_verification",
    )
    # 2026-01-20 - Add privacy consent field
    data_sharing_consent: Mapped[bool] = mapped_column(
        default=False, nullable=False, server_default="false"
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="user")
    # 2026-01-23 - Add user profile fields for display names
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    display_name_pref: Mapped[str | None] = mapped_column(
        String(16), 
        nullable=True, 
        default="name",
        comment="name|username - preference for displaying user name in transactions"
    )
    theme_pref: Mapped[str | None] = mapped_column(String(32), nullable=True)
    currency_pref: Mapped[str | None] = mapped_column(String(3), nullable=True)
    time_zone: Mapped[str] = mapped_column(
        String(64), nullable=False, default="UTC", server_default="UTC"
    )
    developer_payout_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    mfa_secret: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)
    mfa_method: Mapped[str | None] = mapped_column(
        String(16), default="totp", nullable=True, comment="totp|email|sms"
    )
    email_otp: Mapped[str | None] = mapped_column(String(6), nullable=True)
    email_otp_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    weekly_digest_sent_at: Mapped[datetime | None] = mapped_column(
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

    developer: Mapped[Optional["Developer"]] = relationship(
        "Developer",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
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
    # 2025-12-11 14:20 CST - expose support tickets for export usage
    support_tickets: Mapped[list["SupportTicket"]] = relationship(
        "SupportTicket",
        foreign_keys="[SupportTicket.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(
        "NotificationPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notification_devices: Mapped[list["NotificationDevice"]] = relationship(
        "NotificationDevice",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notification_settings: Mapped[Optional["NotificationSettings"]] = relationship(
        "NotificationSettings",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
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
    household_member: Mapped[Optional["HouseholdMember"]] = relationship(
        "HouseholdMember",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    legal_acceptances: Mapped[list["LegalAgreementAcceptance"]] = relationship(
        "LegalAgreementAcceptance",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    documents: Mapped[list["UserDocument"]] = relationship(
        "UserDocument",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"User(uid={self.uid!r}, email={self.email!r}, role={self.role!r})"

    def get_display_name(self) -> str:
        """
        Get the user's display name based on their preference.
        Returns first_name + last_name by default, or username if preferred.
        Falls back to email if no name fields are set.
        """
        if self.display_name_pref == "username" and self.username:
            return self.username
        if self.first_name or self.last_name:
            parts = [self.first_name, self.last_name]
            return " ".join(p for p in parts if p).strip() or self.email
        return self.email

    def to_dict(self) -> dict[str, Any]:
        return {
            "uid": self.uid,
            "email": self.email,
            "phone_number": self.phone_number,
            "role": self.role,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "display_name_pref": self.display_name_pref,
            "theme_pref": self.theme_pref,
            "currency_pref": self.currency_pref,
            "time_zone": self.time_zone,
            "developer_payout_id": str(self.developer_payout_id)
            if self.developer_payout_id
            else None,
            "mfa_enabled": self.mfa_enabled,
            "status": self.status,
            "data_sharing_consent": self.data_sharing_consent,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


__all__ = ["User"]
