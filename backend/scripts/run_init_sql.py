import os
import sqlalchemy
from sqlalchemy import text

db_url = os.getenv("DATABASE_URL")
engine = sqlalchemy.create_engine(db_url)

sql_file = "backend/scripts/init-db.sql"

with open(sql_file, "r") as f:
    sql_script = f.read()

# Split by semicolon (naive split, but might work for this file)
# Better: use a proper SQL parser or just execute the whole thing if the driver supports it
# Psycopg2 (used by SQLAlchemy) usually wants one command at a time or use a special helper

with engine.connect() as conn:
    # Use raw psycopg2 connection to execute the whole script at once
    raw_conn = conn.connection
    with raw_conn.cursor() as cursor:
        cursor.execute(sql_script)
    raw_conn.commit()
    print("Successfully ran init-db.sql")
