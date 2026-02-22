"""Add user timezone and weekly digest tracking

Revision ID: 6c3b1f9a7d2e
Revises: 5b1c7e9a2f4d
Create Date: 2026-02-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "6c3b1f9a7d2e"
down_revision: str | None = "5b1c7e9a2f4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}

    if "time_zone" not in existing:
        op.add_column(
            "users",
            sa.Column(
                "time_zone",
                sa.String(length=64),
                nullable=False,
                server_default="UTC",
            ),
        )
    if "weekly_digest_sent_at" not in existing:
        op.add_column(
            "users",
            sa.Column(
                "weekly_digest_sent_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}

    if "weekly_digest_sent_at" in existing:
        op.drop_column("users", "weekly_digest_sent_at")
    if "time_zone" in existing:
        op.drop_column("users", "time_zone")
