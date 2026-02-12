import os
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    res = conn.execute(text("SELECT current_user, current_database();"))
    user, db = res.fetchone()
    print(f"User: {user}, Database: {db}")
