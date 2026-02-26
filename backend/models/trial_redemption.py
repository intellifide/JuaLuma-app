"""Tracks free-trial redemption signals for anti-abuse controls."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class TrialRedemption(Base):
    __tablename__ = "trial_redemptions"
    __table_args__ = (
        Index("ix_trial_redemptions_email_normalized", "email_normalized"),
        Index("ix_trial_redemptions_card_last4", "card_last4"),
        Index("ix_trial_redemptions_card_fingerprint", "card_fingerprint"),
        UniqueConstraint(
            "stripe_subscription_id",
            name="uq_trial_redemptions_subscription_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False)
    card_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    card_fingerprint: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    plan_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "email_normalized": self.email_normalized,
            "card_last4": self.card_last4,
            "card_fingerprint": self.card_fingerprint,
            "stripe_customer_id": self.stripe_customer_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "plan_code": self.plan_code,
            "created_at": self.created_at.isoformat(),
        }


__all__ = ["TrialRedemption"]
