import os

from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    res = conn.execute(text("SELECT nspname, rolname FROM pg_namespace n JOIN pg_roles r ON n.nspowner = r.oid WHERE nspname = 'audit';"))
    row = res.fetchone()
    if row:
        print(f"Schema: {row[0]}, Owner: {row[1]}")
    else:
        print("Schema 'audit' not found in pg_namespace")
