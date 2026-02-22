"""Add digest schedule day fields

Revision ID: 8a1d3c5e7f90
Revises: 7c9e2a1f3b4d
Create Date: 2026-02-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8a1d3c5e7f90"
down_revision: str | None = "7c9e2a1f3b4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "digest_settings",
        sa.Column(
            "weekly_day_of_week",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "digest_settings",
        sa.Column(
            "day_of_month",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("digest_settings", "day_of_month")
    op.drop_column("digest_settings", "weekly_day_of_week")

