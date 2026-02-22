import sys
import os
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.core.config import settings

def apply_rls():
    print("Applying Row-Level Security migration...")
    
    # Use the database URL from settings
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        script_path = os.path.join(os.path.dirname(__file__), "enable_rls.sql")
        with open(script_path, "r") as f:
            sql_content = f.read()
        
        # Split by semicolon to execute commands individually
        # This is a simple parser; it might break on semicolons in strings, but for this SQL it's safe
        commands = [cmd.strip() for cmd in sql_content.split(";") if cmd.strip()]
        
        for cmd in commands:
            print(f"Executing: {cmd.splitlines()[0][:60]}...")
            db.execute(text(cmd))
        
        db.commit()
        print("RLS migration applied successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    apply_rls()
