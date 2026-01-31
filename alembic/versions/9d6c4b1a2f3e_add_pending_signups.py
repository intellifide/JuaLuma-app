"""Add pending_signups table

Revision ID: 9d6c4b1a2f3e
Revises: f4c2a8e7b9c1
Create Date: 2026-01-31 10:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9d6c4b1a2f3e"
down_revision: str | None = "f4c2a8e7b9c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pending_signups",
        sa.Column("uid", sa.String(length=128), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("first_name", sa.String(length=128), nullable=True),
        sa.Column("last_name", sa.String(length=128), nullable=True),
        sa.Column("username", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending_verification"),
        sa.Column("agreements_json", sa.JSON(), nullable=False),
        sa.Column("email_otp", sa.String(length=6), nullable=True),
        sa.Column("email_otp_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("uq_pending_signups_email", "pending_signups", ["email"])
    op.create_unique_constraint("uq_pending_signups_username", "pending_signups", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_pending_signups_username", "pending_signups", type_="unique")
    op.drop_constraint("uq_pending_signups_email", "pending_signups", type_="unique")
    op.drop_table("pending_signups")
