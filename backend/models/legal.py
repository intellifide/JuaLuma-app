"""Legal agreement acceptance model."""

# Updated 2026-01-19 00:30 CST by ChatGPT

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class LegalAgreementAcceptance(Base):
    __tablename__ = "legal_agreement_acceptances"
    __table_args__ = (
        UniqueConstraint(
            "uid",
            "agreement_key",
            "agreement_version",
            name="uq_legal_agreement_acceptance",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    agreement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    agreement_version: Mapped[str] = mapped_column(String(64), nullable=False)
    acceptance_method: Mapped[str] = mapped_column(
        String(32), nullable=False, default="clickwrap"
    )
    presented_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    source: Mapped[str] = mapped_column(
        String(32), nullable=False, default="frontend"
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    locale: Mapped[str | None] = mapped_column(String(16), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship(
        "User", back_populates="legal_acceptances", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            "LegalAgreementAcceptance("
            f"id={self.id!r}, uid={self.uid!r}, "
            f"agreement_key={self.agreement_key!r}, agreement_version={self.agreement_version!r})"
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "agreement_key": self.agreement_key,
            "agreement_version": self.agreement_version,
            "acceptance_method": self.acceptance_method,
            "presented_at": self.presented_at.isoformat() if self.presented_at else None,
            "accepted_at": self.accepted_at.isoformat(),
            "source": self.source,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "locale": self.locale,
            "metadata_json": self.metadata_json,
            "archived": self.archived,
        }


__all__ = ["LegalAgreementAcceptance"]
