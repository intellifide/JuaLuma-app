import os
import sys
from sqlalchemy import create_engine, text

# Use app_user who owns the tables
DATABASE_URL = "postgresql://jualuma_user:jualuma_password@127.0.0.1:5433/jualuma"

def query_db(sql_query):
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            result = connection.execute(text(sql_query))
            rows = result.fetchall()
            if rows:
                for row in rows:
                    print(row)
            else:
                print("No results returned.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 query_db.py \"<sql_query>\"")
        sys.exit(1)
    query_db(sys.argv[1])
