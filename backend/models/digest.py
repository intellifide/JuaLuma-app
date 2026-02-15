"""Core Purpose: Store scheduled AI financial digest configuration and generated digests per user."""

# Last Updated: 2026-02-03 00:00 CST

from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Time, func
from sqlalchemy.dialects.postgresql import BYTEA, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utils.encryption import decrypt_prompt

from .base import Base

if TYPE_CHECKING:
    from .user import User


class DigestSettings(Base):
    """
    One digest schedule per user (for now).

    Scheduling is stored as:
    - cadence: weekly|monthly|quarterly|annually
    - send_time_local: time-of-day in the user's local timezone
    - next_send_at_utc: computed UTC instant when the next digest should be generated
    """

    __tablename__ = "digest_settings"

    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), primary_key=True
    )

    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cadence: Mapped[str] = mapped_column(
        String(16), nullable=False, default="weekly", server_default="weekly"
    )
    weekly_day_of_week: Mapped[int] = mapped_column(
        nullable=False, default=0, server_default="0"
    )
    day_of_month: Mapped[int] = mapped_column(
        nullable=False, default=1, server_default="1"
    )
    send_time_local: Mapped[time] = mapped_column(
        Time(), nullable=False, server_default="10:00:00"
    )

    delivery_in_app: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    delivery_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4
    )

    next_send_at_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sent_at_utc: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_period_key: Mapped[str | None] = mapped_column(String(32), nullable=True)

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

    def to_dict(self) -> dict[str, object | None]:
        return {
            "enabled": self.enabled,
            "cadence": self.cadence,
            "weekly_day_of_week": self.weekly_day_of_week,
            "day_of_month": self.day_of_month,
            "send_time_local": self.send_time_local.strftime("%H:%M"),
            "delivery_in_app": self.delivery_in_app,
            "delivery_email": self.delivery_email,
            "thread_id": str(self.thread_id),
            "next_send_at_utc": self.next_send_at_utc.isoformat()
            if self.next_send_at_utc
            else None,
            "last_sent_at_utc": self.last_sent_at_utc.isoformat()
            if self.last_sent_at_utc
            else None,
        }


class DigestMessage(Base):
    """One generated digest message (assistant output) appended to the digest thread."""

    __tablename__ = "digest_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    period_key: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="gemini")
    tokens: Mapped[int] = mapped_column(nullable=False, default=0)
    user_dek_ref: Mapped[str] = mapped_column(String(256), nullable=False)

    encrypted_prompt: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    encrypted_response: Mapped[bytes] = mapped_column(BYTEA, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", lazy="selectin")

    def to_chat_messages(self) -> list[dict[str, str]]:
        # Store ciphertext as bytes; decrypt expects str.
        prompt = decrypt_prompt(self.encrypted_prompt.decode("utf-8"), user_dek_ref=self.user_dek_ref)
        response = decrypt_prompt(self.encrypted_response.decode("utf-8"), user_dek_ref=self.user_dek_ref)
        ts = self.created_at.isoformat()
        return [
            {"role": "user", "text": prompt, "time": ts},
            {"role": "assistant", "text": response, "time": ts},
        ]


__all__ = ["DigestSettings", "DigestMessage"]
