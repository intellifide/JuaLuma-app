"""
Create all database tables from SQLAlchemy models and stamp Alembic at HEAD.

This script:
1. Creates the audit schema
2. Uses Base.metadata.create_all() to create ALL tables from current models
3. Dynamically finds the Alembic HEAD revision
4. Stamps the alembic_version table at that revision

This bypasses the migration chain entirely, creating the schema as the models
currently define it.

WARNING: Only use on a clean/empty database. Will fail using this script if tables already exist
but have schema mismatches (create_all skips existing tables).
"""

import os
import sys

# Ensure the parent directory is on sys.path so 'backend' package is importable
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic.script import ScriptDirectory
import backend.models  # noqa: E402,F401
from backend.models import Base  # noqa: E402

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(db_url, echo=False)

# ── 1. Create audit schema ──
with engine.connect() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit"))
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    conn.commit()
    print("✅ Created audit schema and extensions")

# ── 2. Import all models (trigger registration) ──
print(f"Registered {len(Base.metadata.tables)} tables from models")

# ── 3. Create all tables ──
Base.metadata.create_all(engine)
print("✅ All tables created from models")

# ── 4. Stamp alembic_version at HEAD ──
try:
    alembic_ini_path = os.path.join(APP_DIR, "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    # Force script location to absolute path to avoid relative path issues
    alembic_cfg.set_main_option("script_location", os.path.join(APP_DIR, "alembic"))
    
    script = ScriptDirectory.from_config(alembic_cfg)
    heads = script.get_heads()
    
    if not heads:
        print("⚠️  No Alembic heads found!")
        sys.exit(1)
        
    HEAD_REVISION = heads[0]
    
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            )
        """))
        conn.execute(text("DELETE FROM alembic_version"))
        conn.execute(text(
            f"INSERT INTO alembic_version (version_num) VALUES ('{HEAD_REVISION}')"
        ))
        conn.commit()
        print(f"✅ Stamped alembic_version at HEAD: {HEAD_REVISION}")

except Exception as e:
    print(f"❌ Error getting Alembic HEAD: {e}")
    sys.exit(1)

# ── 5. Create additional indexes ──
with engine.connect() as conn:
    try:
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_transactions_uid_ts_desc "
            "ON transactions(uid, ts DESC)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_transactions_uid_category "
            "ON transactions(uid, category)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_transactions_account_id "
            "ON transactions(account_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ledger_hot_free_uid_ts "
            "ON ledger_hot_free(uid, ts DESC)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ledger_hot_free_account "
            "ON ledger_hot_free(account_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ledger_hot_ess_uid_ts "
            "ON ledger_hot_essential(uid, ts DESC)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_ledger_hot_ess_account "
            "ON ledger_hot_essential(account_id)"
        ))
        conn.commit()
        print("✅ Additional indexes created")
    except Exception as e:
        print(f"⚠️  Index creation warning (non-fatal): {e}")

print("\n🎉 Database schema fully initialized and stamped at HEAD.")
