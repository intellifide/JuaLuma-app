"""Audit schema models."""

# Updated 2025-12-08 17:45 CST by ChatGPT

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func
from sqlalchemy.dialects.postgresql import BYTEA, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        CheckConstraint(
            "source IN ('frontend', 'backend', 'workflow')",
            name="ck_audit_log_source",
        ),
        {"schema": "audit"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actor_uid: Mapped[str] = mapped_column(String(128), nullable=False)
    target_uid: Mapped[str] = mapped_column(String(128), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="frontend|backend|workflow",
    )
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"AuditLog(id={self.id!r}, action={self.action!r}, actor_uid={self.actor_uid!r})"


class FeaturePreview(Base):
    __tablename__ = "feature_preview"
    __table_args__ = (
        {"schema": "audit"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    uid: Mapped[str] = mapped_column(String(128), nullable=False)
    feature_key: Mapped[str] = mapped_column(String(128), nullable=False)
    tier: Mapped[str] = mapped_column(String(32), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"FeaturePreview(id={self.id!r}, feature_key={self.feature_key!r}, uid={self.uid!r})"


class LLMLog(Base):
    __tablename__ = "llm_logs"
    __table_args__ = (
        {"schema": "audit"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    uid: Mapped[str] = mapped_column(String(128), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    encrypted_prompt: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    encrypted_response: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    tokens: Mapped[int] = mapped_column(nullable=False)
    user_dek_ref: Mapped[str] = mapped_column(String(256), nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"LLMLog(id={self.id!r}, uid={self.uid!r}, model={self.model!r})"


class SupportPortalAction(Base):
    __tablename__ = "support_portal_actions"
    __table_args__ = (
        {"schema": "audit"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    agent_id: Mapped[str] = mapped_column(String(128), nullable=False)
    agent_company_id: Mapped[str] = mapped_column(String(32), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(256), nullable=False)
    ticket_id: Mapped[str] = mapped_column(String(128), nullable=False)
    customer_uid: Mapped[str] = mapped_column(String(128), nullable=True)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    action_details: Mapped[dict] = mapped_column(JSONB, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return (
            f"SupportPortalAction(id={self.id!r}, agent_company_id={self.agent_company_id!r}, "
            f"ticket_id={self.ticket_id!r})"
        )


__all__ = ["AuditLog", "FeaturePreview", "LLMLog", "SupportPortalAction"]
