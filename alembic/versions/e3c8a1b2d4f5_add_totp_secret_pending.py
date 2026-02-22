"""Add pending authenticator secret field

Revision ID: e3c8a1b2d4f5
Revises: d1f4b2c8a9e7
Create Date: 2026-02-04 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e3c8a1b2d4f5"
down_revision: str | None = "d1f4b2c8a9e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "totp_secret_pending" not in user_cols:
        op.add_column(
            "users", sa.Column("totp_secret_pending", sa.String(length=32), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "totp_secret_pending" in user_cols:
        op.drop_column("users", "totp_secret_pending")
