import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Household(Base):
    __tablename__ = "households"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_uid])
    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household", cascade="all, delete-orphan"
    )
    invites: Mapped[list["HouseholdInvite"]] = relationship(
        "HouseholdInvite", back_populates="household", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"Household(id={self.id!r}, name={self.name!r}, owner={self.owner_uid!r})"
        )


class HouseholdMember(Base):
    __tablename__ = "household_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), unique=True, nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(32),
        default="member",
        nullable=False,
        comment="admin|member|restricted_member",
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Permissions
    can_view_household: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    ai_access_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="members")
    user: Mapped["User"] = relationship(
        "User", foreign_keys=[uid], back_populates="household_member"
    )

    def __repr__(self) -> str:
        return f"HouseholdMember(uid={self.uid!r}, household_id={self.household_id!r}, role={self.role!r})"


class HouseholdInvite(Base):
    __tablename__ = "household_invites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        default="pending",
        nullable=False,
        comment="pending|accepted|expired",
    )
    is_minor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="invites")

    def __repr__(self) -> str:
        return f"HouseholdInvite(email={self.email!r}, household_id={self.household_id!r}, status={self.status!r})"
