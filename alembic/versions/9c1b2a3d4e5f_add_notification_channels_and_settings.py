# Core Purpose: Alembic migration for notification channels and settings.
# Last Updated: 2026-01-23 22:39 CST
"""add_notification_channels_and_settings

Revision ID: 9c1b2a3d4e5f
Revises: a2b3c4d5e6f7
Create Date: 2026-01-23 22:39:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9c1b2a3d4e5f"
down_revision: str | None = "a2b3c4d5e6f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply notification channel and settings schema updates."""
    op.alter_column(
        "notification_preferences",
        "channel_sms",
        existing_type=sa.Boolean(),
        server_default="true",
    )
    op.add_column(
        "notification_preferences",
        sa.Column("channel_push", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("channel_in_app", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "users",
        sa.Column("phone_number", sa.String(length=32), nullable=True),
    )

    op.create_table(
        "notification_settings",
        sa.Column(
            "uid", sa.String(length=128), sa.ForeignKey("users.uid"), primary_key=True
        ),
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default="UTC",
        ),
        sa.Column("quiet_hours_start", sa.Time(), nullable=True),
        sa.Column("quiet_hours_end", sa.Time(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "notification_devices",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "uid", sa.String(length=128), sa.ForeignKey("users.uid"), nullable=False
        ),
        sa.Column("device_token", sa.String(length=256), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("uid", "device_token", name="uq_notification_device"),
    )


def downgrade() -> None:
    """Rollback notification channel and settings schema updates."""
    op.drop_table("notification_devices")
    op.drop_table("notification_settings")
    op.drop_column("notification_preferences", "channel_in_app")
    op.drop_column("notification_preferences", "channel_push")
    op.drop_column("users", "phone_number")
    op.alter_column(
        "notification_preferences",
        "channel_sms",
        existing_type=sa.Boolean(),
        server_default=None,
    )
