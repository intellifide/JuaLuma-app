"""
Reset database to a clean state so Alembic can run all migrations from scratch.

Drops ALL tables in public and audit schemas, then drops the alembic_version table.
This allows `alembic upgrade head` to run the full migration chain cleanly.

WARNING: This destroys all data. Only use on dev instances.
"""

import os
import sys

from sqlalchemy import create_engine, inspect, text

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    inspector = inspect(conn)

    # ── 1. Drop all tables in audit schema ──
    audit_tables = inspector.get_table_names(schema="audit")
    print(f"Audit schema tables to drop: {audit_tables}")
    for table in audit_tables:
        conn.execute(text(f'DROP TABLE IF EXISTS audit."{table}" CASCADE'))
        print(f"  Dropped audit.{table}")

    # ── 2. Drop all tables in public schema ──
    public_tables = inspector.get_table_names(schema="public")
    print(f"Public schema tables to drop: {public_tables}")
    for table in public_tables:
        conn.execute(text(f'DROP TABLE IF EXISTS public."{table}" CASCADE'))
        print(f"  Dropped public.{table}")

    # ── 3. Drop alembic_version if it exists ──
    conn.execute(text("DROP TABLE IF EXISTS public.alembic_version CASCADE"))
    print("Dropped alembic_version table")

    # ── 4. Drop and recreate audit schema (clean slate) ──
    conn.execute(text("DROP SCHEMA IF EXISTS audit CASCADE"))
    conn.execute(text("CREATE SCHEMA audit"))
    print("Recreated audit schema")

    # ── 5. Ensure extensions exist ──
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    print("Ensured pgvector and pgcrypto extensions")

    conn.commit()
    print("\n✅ Database reset complete. Ready for `alembic upgrade head`.")
