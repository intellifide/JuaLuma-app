import os
import sys
from sqlalchemy import create_engine, text

# Use postgres user for admin tasks
DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5433/jualuma"

def run_sql_file(file_path):
    print(f"Executing {file_path} as postgres...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            with open(file_path, 'r') as f:
                sql = f.read()
                # Split by semicolon to handle multiple statements
                # This is a naive split but sufficient for our simple scripts
                statements = sql.split(';')
                for stmt in statements:
                    if stmt.strip():
                        print(f"Executing: {stmt[:50]}...")
                        connection.execute(text(stmt))
                connection.commit()
        print("Success.")
    except Exception as e:
        print(f"Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 execute_as_postgres.py <sql_file>")
        sys.exit(1)
    run_sql_file(sys.argv[1])
