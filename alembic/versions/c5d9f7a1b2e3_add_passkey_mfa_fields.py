"""Add passkey MFA fields

Revision ID: c5d9f7a1b2e3
Revises: 8b6f2a1c4d7e
Create Date: 2026-02-04 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c5d9f7a1b2e3"
down_revision: str | None = "8b6f2a1c4d7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "passkey_credential_id" not in user_cols:
        op.add_column(
            "users", sa.Column("passkey_credential_id", sa.String(length=512), nullable=True)
        )
    if "passkey_public_key" not in user_cols:
        op.add_column("users", sa.Column("passkey_public_key", sa.Text(), nullable=True))
    if "passkey_sign_count" not in user_cols:
        op.add_column("users", sa.Column("passkey_sign_count", sa.Integer(), nullable=True))
    if "passkey_challenge" not in user_cols:
        op.add_column("users", sa.Column("passkey_challenge", sa.String(length=512), nullable=True))
    if "passkey_challenge_expires_at" not in user_cols:
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
    session_cols = {col["name"] for col in inspector.get_columns("user_sessions")}
    if "mfa_verified_at" not in session_cols:
        op.add_column(
            "user_sessions",
            sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "mfa_method_verified" not in session_cols:
        op.add_column(
            "user_sessions",
            sa.Column("mfa_method_verified", sa.String(length=16), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    op.alter_column(
        "users",
        "mfa_method",
        existing_type=sa.String(length=16),
        comment="totp|email|sms",
        existing_nullable=True,
    )
    session_cols = {col["name"] for col in inspector.get_columns("user_sessions")}
    if "mfa_method_verified" in session_cols:
        op.drop_column("user_sessions", "mfa_method_verified")
    if "mfa_verified_at" in session_cols:
        op.drop_column("user_sessions", "mfa_verified_at")

    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "passkey_challenge_expires_at" in user_cols:
        op.drop_column("users", "passkey_challenge_expires_at")
    if "passkey_challenge" in user_cols:
        op.drop_column("users", "passkey_challenge")
    if "passkey_sign_count" in user_cols:
        op.drop_column("users", "passkey_sign_count")
    if "passkey_public_key" in user_cols:
        op.drop_column("users", "passkey_public_key")
    if "passkey_credential_id" in user_cols:
        op.drop_column("users", "passkey_credential_id")
