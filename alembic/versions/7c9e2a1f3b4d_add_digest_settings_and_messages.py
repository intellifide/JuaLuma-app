"""Add digest settings and messages tables

Revision ID: 7c9e2a1f3b4d
Revises: 6c3b1f9a7d2e
Create Date: 2026-02-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "7c9e2a1f3b4d"
down_revision: str | None = "6c3b1f9a7d2e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "digest_settings",
        sa.Column("uid", sa.String(length=128), primary_key=True, nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "cadence",
            sa.String(length=16),
            nullable=False,
            server_default="weekly",
        ),
        sa.Column(
            "send_time_local",
            sa.Time(),
            nullable=False,
            server_default="10:00:00",
        ),
        sa.Column(
            "timeframe",
            sa.String(length=16),
            nullable=False,
            server_default="1w",
        ),
        sa.Column(
            "delivery_in_app",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "delivery_email",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "thread_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("next_send_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sent_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_period_key", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
    )

    op.create_table(
        "digest_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("uid", sa.String(length=128), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_key", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=False, server_default="gemini"),
        sa.Column("tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("user_dek_ref", sa.String(length=256), nullable=False),
        sa.Column("encrypted_prompt", postgresql.BYTEA(), nullable=False),
        sa.Column("encrypted_response", postgresql.BYTEA(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_digest_messages_uid_thread_created",
        "digest_messages",
        ["uid", "thread_id", "created_at"],
    )
    op.create_index(
        "ix_digest_settings_next_send_at_utc",
        "digest_settings",
        ["next_send_at_utc"],
    )


def downgrade() -> None:
    op.drop_index("ix_digest_settings_next_send_at_utc", table_name="digest_settings")
    op.drop_index("ix_digest_messages_uid_thread_created", table_name="digest_messages")
    op.drop_table("digest_messages")
    op.drop_table("digest_settings")

