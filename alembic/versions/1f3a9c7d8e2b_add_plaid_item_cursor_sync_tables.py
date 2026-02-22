"""Add Plaid item-centric sync tables and backfill legacy links.

Revision ID: 1f3a9c7d8e2b
Revises: f6a1c3e9b2d4
Create Date: 2026-02-10 14:05:00.000000

"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1f3a9c7d8e2b"
down_revision: str | Sequence[str] | None = "f6a1c3e9b2d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _legacy_item_id(uid: str, secret_ref: str) -> str:
    digest = hashlib.sha256(f"{uid}:{secret_ref}".encode("utf-8")).hexdigest()
    return f"legacy-{digest[:40]}"


def _backfill_plaid_items(connection: sa.Connection) -> None:
    now_utc = datetime.now(UTC)

    accounts = sa.table(
        "accounts",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("uid", sa.String()),
        sa.column("account_type", sa.String()),
        sa.column("provider", sa.String()),
        sa.column("secret_ref", sa.String()),
    )
    plaid_items = sa.table(
        "plaid_items",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("uid", sa.String()),
        sa.column("item_id", sa.String()),
        sa.column("institution_name", sa.String()),
        sa.column("secret_ref", sa.String()),
        sa.column("sync_status", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    plaid_item_accounts = sa.table(
        "plaid_item_accounts",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("uid", sa.String()),
        sa.column("plaid_item_id", postgresql.UUID(as_uuid=True)),
        sa.column("account_id", postgresql.UUID(as_uuid=True)),
        sa.column("plaid_account_id", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("last_seen_at", sa.DateTime(timezone=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    rows = (
        connection.execute(
            sa.select(
                accounts.c.id,
                accounts.c.uid,
                accounts.c.provider,
                accounts.c.secret_ref,
            ).where(
                accounts.c.account_type.in_(["traditional", "investment"]),
                accounts.c.secret_ref.isnot(None),
                accounts.c.secret_ref != "",
            )
        )
        .mappings()
        .all()
    )
    if not rows:
        return

    grouped: dict[tuple[str, str], list[dict[str, object]]] = {}
    for row in rows:
        uid = str(row["uid"])
        secret_ref = str(row["secret_ref"])
        grouped.setdefault((uid, secret_ref), []).append(row)

    for (uid, secret_ref), grouped_rows in grouped.items():
        item_id = _legacy_item_id(uid, secret_ref)
        provider = next(
            (
                str(group_row["provider"])
                for group_row in grouped_rows
                if group_row.get("provider")
            ),
            None,
        )

        plaid_item_pk = connection.execute(
            sa.select(plaid_items.c.id).where(plaid_items.c.item_id == item_id)
        ).scalar_one_or_none()
        if plaid_item_pk is None:
            plaid_item_pk = uuid.uuid4()
            connection.execute(
                plaid_items.insert().values(
                    id=plaid_item_pk,
                    uid=uid,
                    item_id=item_id,
                    institution_name=provider,
                    secret_ref=secret_ref,
                    sync_status="sync_needed",
                    created_at=now_utc,
                    updated_at=now_utc,
                )
            )

        for group_row in grouped_rows:
            account_id = group_row["id"]
            existing_mapping = connection.execute(
                sa.select(plaid_item_accounts.c.id).where(
                    plaid_item_accounts.c.account_id == account_id
                )
            ).scalar_one_or_none()
            if existing_mapping is not None:
                continue

            connection.execute(
                plaid_item_accounts.insert().values(
                    id=uuid.uuid4(),
                    uid=uid,
                    plaid_item_id=plaid_item_pk,
                    account_id=account_id,
                    plaid_account_id=None,
                    is_active=True,
                    last_seen_at=None,
                    created_at=now_utc,
                    updated_at=now_utc,
                )
            )


def upgrade() -> None:
    op.create_table(
        "plaid_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uid", sa.String(length=128), nullable=False),
        sa.Column("item_id", sa.String(length=128), nullable=False),
        sa.Column("institution_name", sa.String(length=128), nullable=True),
        sa.Column("secret_ref", sa.String(length=512), nullable=False),
        sa.Column("next_cursor", sa.String(length=512), nullable=True),
        sa.Column("sync_status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_needed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_webhook_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_error", sa.Text(), nullable=True),
        sa.Column("reauth_needed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cleanup_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("item_id", name="uq_plaid_items_item_id"),
    )
    op.create_index("idx_plaid_items_uid_status", "plaid_items", ["uid", "sync_status"])
    op.create_index("idx_plaid_items_sync_needed", "plaid_items", ["sync_needed_at"])

    op.create_table(
        "plaid_item_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uid", sa.String(length=128), nullable=False),
        sa.Column("plaid_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plaid_account_id", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["uid"], ["users.uid"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plaid_item_id"], ["plaid_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plaid_item_id", "account_id", name="uq_plaid_item_accounts_item_account"),
        sa.UniqueConstraint("uid", "plaid_account_id", name="uq_plaid_item_accounts_uid_plaid_account_id"),
    )
    op.create_index("idx_plaid_item_accounts_account", "plaid_item_accounts", ["account_id"])

    op.create_table(
        "plaid_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", sa.String(length=128), nullable=True),
        sa.Column("webhook_type", sa.String(length=64), nullable=True),
        sa.Column("webhook_code", sa.String(length=128), nullable=True),
        sa.Column("dedupe_key", sa.String(length=128), nullable=False),
        sa.Column("signature_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key", name="uq_plaid_webhook_events_dedupe_key"),
    )
    op.create_index("idx_plaid_webhook_events_item", "plaid_webhook_events", ["item_id"])

    _backfill_plaid_items(op.get_bind())


def downgrade() -> None:
    op.drop_index("idx_plaid_webhook_events_item", table_name="plaid_webhook_events")
    op.drop_table("plaid_webhook_events")
    op.drop_index("idx_plaid_item_accounts_account", table_name="plaid_item_accounts")
    op.drop_table("plaid_item_accounts")
    op.drop_index("idx_plaid_items_sync_needed", table_name="plaid_items")
    op.drop_index("idx_plaid_items_uid_status", table_name="plaid_items")
    op.drop_table("plaid_items")
