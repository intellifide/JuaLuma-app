"""add_notification_triggers_and_budget_alerts

Revision ID: f2a4b6c8d0e1
Revises: 9c1b2a3d4e5f
Create Date: 2026-01-23 23:05:00.000000

"""

# Core Purpose: Add notification trigger thresholds and budget alert fields.
# Last Updated: 2026-01-23 23:05 CST

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2a4b6c8d0e1"
down_revision: str | None = "9c1b2a3d4e5f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply notification trigger and budget alert schema updates."""
    op.add_column(
        "notification_settings",
        sa.Column("low_balance_threshold", sa.Float(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("large_transaction_threshold", sa.Float(), nullable=True),
    )

    op.add_column(
        "budgets",
        sa.Column("alert_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "budgets",
        sa.Column(
            "alert_threshold_percent",
            sa.Float(),
            nullable=False,
            server_default="0.8",
        ),
    )


def downgrade() -> None:
    """Rollback notification trigger and budget alert schema updates."""
    op.drop_column("budgets", "alert_threshold_percent")
    op.drop_column("budgets", "alert_enabled")
    op.drop_column("notification_settings", "large_transaction_threshold")
    op.drop_column("notification_settings", "low_balance_threshold")
