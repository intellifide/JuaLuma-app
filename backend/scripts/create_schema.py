import os

from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

# Ensure we use the right driver if needed, but DATABASE_URL usually has it
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Creating audit schema...")
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit;"))
    conn.commit()
    print("Audit schema created successfully.")
