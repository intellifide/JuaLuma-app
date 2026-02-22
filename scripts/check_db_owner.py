import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5433/jualuma"

def check_owner():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            print("Current User:", conn.execute(text("SELECT current_user, session_user")).fetchone())
            
            # Check superuser status
            is_super = conn.execute(text("SELECT usesuper FROM pg_user WHERE usename = current_user")).fetchone()
            print(f"Is Superuser? {is_super}")
            
            # Check table owner
            owner = conn.execute(text("SELECT tableowner FROM pg_tables WHERE tablename = 'transactions'")).fetchone()
            print(f"Transactions Table Owner: {owner}")
            
            owner_pending = conn.execute(text("SELECT tableowner FROM pg_tables WHERE tablename = 'pending_signups'")).fetchone()
            print(f"Pending Signups Table Owner: {owner_pending}")

    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    check_owner()
