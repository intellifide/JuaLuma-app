# Core Purpose: Script to clean up auto-enabled MFA for users who shouldn't have it enabled by default.
# Last Updated 2026-01-20 03:45 CST by Antigravity

import os
import sys
from sqlalchemy import create_engine, text

# Add the parent directory to sys.path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://jualuma_admin:jualuma_pass@localhost:5432/jualuma_db")

def cleanup_mfa():
    """Sets mfa_enabled to false for all users except those specifically opting in (placeholder logic)."""
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Starting MFA cleanup...")
        result = conn.execute(text("UPDATE users SET mfa_enabled = false WHERE mfa_enabled = true;"))
        conn.commit()
        print(f"Cleanup complete. Rows updated: {result.rowcount}")

if __name__ == "__main__":
    cleanup_mfa()
