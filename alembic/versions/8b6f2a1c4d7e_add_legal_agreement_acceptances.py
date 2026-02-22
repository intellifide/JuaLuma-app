"""add legal agreement acceptances

Revision ID: 8b6f2a1c4d7e
Revises: 2569d140160b
Create Date: 2026-01-19 00:35:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8b6f2a1c4d7e"
down_revision: str | None = "2569d140160b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "legal_agreement_acceptances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "uid",
            sa.String(length=128),
            sa.ForeignKey("users.uid"),
            nullable=False,
        ),
        sa.Column("agreement_key", sa.String(length=64), nullable=False),
        sa.Column("agreement_version", sa.String(length=64), nullable=False),
        sa.Column(
            "acceptance_method",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'clickwrap'"),
        ),
        sa.Column("presented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "source",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'frontend'"),
        ),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.UniqueConstraint(
            "uid",
            "agreement_key",
            "agreement_version",
            name="uq_legal_agreement_acceptance",
        ),
    )
    op.create_index(
        "ix_legal_agreement_acceptances_uid_key",
        "legal_agreement_acceptances",
        ["uid", "agreement_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_legal_agreement_acceptances_uid_key", table_name="legal_agreement_acceptances")
    op.drop_table("legal_agreement_acceptances")
