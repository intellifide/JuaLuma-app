import os

from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    res = conn.execute(text("SHOW search_path;"))
    path = res.fetchone()[0]
    print(f"Search path: {path}")

    # Try creating a temporary table in audit
    try:
        conn.execute(text("CREATE TABLE audit.test_visibility (id int); DROP TABLE audit.test_visibility;"))
        conn.commit()
        print("Successfully created and dropped table in audit schema.")
    except Exception as e:
        print(f"Error accessing audit schema: {e}")
