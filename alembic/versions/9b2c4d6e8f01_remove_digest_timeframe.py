"""Remove digest timeframe column (cadence defines range)

Revision ID: 9b2c4d6e8f01
Revises: 8a1d3c5e7f90
Create Date: 2026-02-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "9b2c4d6e8f01"
down_revision: str | None = "8a1d3c5e7f90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = {col["name"] for col in inspector.get_columns("digest_settings")}
    if "timeframe" in cols:
        op.drop_column("digest_settings", "timeframe")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = {col["name"] for col in inspector.get_columns("digest_settings")}
    if "timeframe" not in cols:
        op.add_column(
            "digest_settings",
            sa.Column(
                "timeframe",
                sa.String(length=16),
                nullable=False,
                server_default="1w",
            ),
        )

