"""Add passkey MFA fields

Revision ID: c5d9f7a1b2e3
Revises: 8b6f2a1c4d7e
Create Date: 2026-02-04 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c5d9f7a1b2e3"
down_revision: str | None = "8b6f2a1c4d7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("passkey_credential_id", sa.String(length=512), nullable=True)
    )
    op.add_column("users", sa.Column("passkey_public_key", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("passkey_sign_count", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("passkey_challenge", sa.String(length=512), nullable=True))
    op.add_column(
        "users",
        sa.Column("passkey_challenge_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column(
        "users",
        "mfa_method",
        existing_type=sa.String(length=16),
        comment="totp|email|passkey|sms",
        existing_nullable=True,
    )
    op.add_column(
        "user_sessions",
        sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "user_sessions",
        sa.Column("mfa_method_verified", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "mfa_method",
        existing_type=sa.String(length=16),
        comment="totp|email|sms",
        existing_nullable=True,
    )
    op.drop_column("user_sessions", "mfa_method_verified")
    op.drop_column("user_sessions", "mfa_verified_at")
    op.drop_column("users", "passkey_challenge_expires_at")
    op.drop_column("users", "passkey_challenge")
    op.drop_column("users", "passkey_sign_count")
    op.drop_column("users", "passkey_public_key")
    op.drop_column("users", "passkey_credential_id")
