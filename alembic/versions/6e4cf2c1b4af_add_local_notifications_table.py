"""Add local_notifications table for ticket alerts

Revision ID: 6e4cf2c1b4af
Revises: 09510e76e5e9
Create Date: 2025-12-11 15:05:00.000000

"""

# Updated 2025-12-11 15:05 CST by ChatGPT - add ticket resolution notifications
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6e4cf2c1b4af"
down_revision: str | None = "09510e76e5e9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "local_notifications",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column("uid", sa.String(length=128), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_key", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["ticket_id"], ["support_tickets.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "uid", "ticket_id", "event_key", name="uq_local_notification_ticket_event"
        ),
    )


def downgrade() -> None:
    op.drop_table("local_notifications")
