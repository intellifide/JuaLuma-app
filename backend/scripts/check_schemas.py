import os

from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    result = conn.execute(text("SELECT schema_name FROM information_schema.schemata;"))
    schemas = [row[0] for row in result]
    print(f"Existing schemas: {schemas}")
