"""WidgetRating model definition."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Integer, Text
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .widget import Widget
    from .user import User


class WidgetRating(Base):
    __tablename__ = "widget_ratings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    widget_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("widgets.id"), nullable=False
    )
    user_uid: Mapped[str] = mapped_column(
        String(128), ForeignKey("users.uid"), nullable=False
    )
    
    rating: Mapped[int] = mapped_column(Integer, nullable=False) # 1-5
    review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    widget: Mapped["Widget"] = relationship("Widget", backref="ratings")
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"WidgetRating(id={self.id!r}, widget_id={self.widget_id!r}, rating={self.rating!r})"


__all__ = ["WidgetRating"]
