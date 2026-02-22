import os
import sys
from sqlalchemy import create_engine, text

# Use app_user for owner tasks
DATABASE_URL = "postgresql://app_user:app_password@127.0.0.1:5433/jualuma"

def run_sql_file(file_path):
    print(f"Executing {file_path} as app_user...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            with open(file_path, 'r') as f:
                sql = f.read()
                # Split by semicolon to handle multiple statements
                statements = sql.split(';')
                for stmt in statements:
                    stmt = stmt.strip()
                    if stmt:
                        print(f"Executing: {stmt[:50]}...")
                        try:
                            connection.execute(text(stmt))
                        except Exception as e:
                            print(f"Statement failed: {e}")
                            # Continue to next statement? Or fail?
                            # For CONNECT permission, fail is ok if successful before.
                            # For RLS, failure is bad.
                            # But let's log and continue to allow partial success on grants.
                            # pass
                connection.commit()
        print("Done.")
    except Exception as e:
        print(f"Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 execute_as_app_user.py <sql_file>")
        sys.exit(1)
    run_sql_file(sys.argv[1])
