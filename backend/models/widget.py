"""Widget model definition."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Float, Integer
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .developer import Developer


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    developer_uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("developers.uid"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="general", nullable=False)
    
    # Status: pending, approved, suspended, removed
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    
    scopes: Mapped[Optional[list]] = mapped_column(JSONB, default=list, nullable=False)
    preview_data: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict, nullable=False)
    
    downloads: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    developer: Mapped["Developer"] = relationship("Developer", backref="widgets", lazy="selectin")

    def __repr__(self) -> str:
        return f"Widget(id={self.id!r}, name={self.name!r}, status={self.status!r})"


__all__ = ["Widget"]
