"""Add support ticket queue and assignment fields

Revision ID: c7f9d4b2a1e0
Revises: f2a4b6c8d0e1
Create Date: 2026-01-26 10:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7f9d4b2a1e0"
down_revision: str | None = "f2a4b6c8d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "support_tickets",
        sa.Column(
            "queue_status",
            sa.String(length=32),
            nullable=False,
            server_default="queued",
        ),
    )
    op.add_column(
        "support_tickets",
        sa.Column("assigned_agent_uid", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "support_tickets",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "support_tickets",
        sa.Column(
            "escalated_to_developer",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "support_tickets",
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "support_tickets",
        sa.Column("escalated_by_uid", sa.String(length=128), nullable=True),
    )
    op.create_foreign_key(
        "fk_support_tickets_assigned_agent_uid_users",
        "support_tickets",
        "users",
        ["assigned_agent_uid"],
        ["uid"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_support_tickets_assigned_agent_uid_users",
        "support_tickets",
        type_="foreignkey",
    )
    op.drop_column("support_tickets", "escalated_by_uid")
    op.drop_column("support_tickets", "escalated_at")
    op.drop_column("support_tickets", "escalated_to_developer")
    op.drop_column("support_tickets", "assigned_at")
    op.drop_column("support_tickets", "assigned_agent_uid")
    op.drop_column("support_tickets", "queue_status")
