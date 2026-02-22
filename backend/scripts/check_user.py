import os

from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    res = conn.execute(text("SELECT current_user, current_database();"))
    row = res.fetchone()
    if row is None:
        print("No row returned")
    else:
        user, db = row
        print(f"User: {user}, Database: {db}")
