"""User session model definition."""

# Created 2026-01-20 12:45 CST by Antigravity

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, String, func, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (UniqueConstraint("uid", "iat", name="uq_user_session_uid_iat"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    uid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    # iat is the "Issued At" timestamp from the Firebase token. 
    # This helps us identify the specific session instance.
    iat: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    location: Mapped[str | None] = mapped_column(String(256), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_active: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"UserSession(id={self.id!r}, uid={self.uid!r}, iat={self.iat!r}, is_active={self.is_active!r})"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "uid": self.uid,
            "iat": self.iat,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "device_type": self.device_type,
            "location": self.location,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_active": self.last_active.isoformat() if self.last_active else None,
        }


__all__ = ["UserSession"]
