import sys
import os
import uuid
from datetime import datetime
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.core.config import settings

def test_rls():
    print("Testing Row-Level Security...")
    
    # Use the database URL from settings
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. Check if data exists, if not create it
        # Try to find a valid UID existing in transactions
        valid_uid = db.execute(text("SELECT uid FROM transactions LIMIT 1")).scalar()
        
        if not valid_uid:
            print("No transactions found. Creating dummy data...")
            # Create a dummy user
            test_uid = f"test_user_{uuid.uuid4().hex[:8]}"
            try:
                # Insert User (validating all required fields)
                # We use ON CONFLICT DO NOTHING just in case
                db.execute(text("INSERT INTO users (uid, email, role, mfa_enabled, status, data_sharing_consent, time_zone, created_at, updated_at) VALUES (:uid, :email, 'user', false, 'active', false, 'UTC', NOW(), NOW()) ON CONFLICT (uid) DO NOTHING"), {"uid": test_uid, "email": f"{test_uid}@example.com"})
                
                # Create a dummy account
                account_id = uuid.uuid4()
                # Insert Account
                # Assuming accounts table has id, uid, name, balance...
                # We use account_type instead of type
                db.execute(text("INSERT INTO accounts (id, uid, account_type, account_name, balance, currency, created_at, updated_at) VALUES (:id, :uid, 'checking', 'Test Account', 1000, 'USD', NOW(), NOW())"), {"id": account_id, "uid": test_uid})
                
                # Create a dummy transaction
                tx_id = uuid.uuid4()
                # Set context for transaction insert (required by RLS)
                db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": test_uid})
                db.execute(text("INSERT INTO transactions (id, uid, account_id, amount, currency, ts, description, is_manual, archived, created_at, updated_at) VALUES (:id, :uid, :aid, -50.00, 'USD', NOW(), 'Test Transaction', false, false, NOW(), NOW())"), {"id": tx_id, "uid": test_uid, "aid": account_id})
                
                db.commit()
                print(f"Created test data for UID: {test_uid}")
                valid_uid = test_uid
            except Exception as e:
                db.rollback()
                print(f"Failed to create test data: {e}")
                print("Proceeding with tests (might result in inconclusive if no data)...")
        else:
             print(f"Found existing transaction for UID: {valid_uid}")

        # 2. Query WITHOUT context
        # This checks if the default isolation works
        # Note: We use a fresh execute to ensure we are seemingly 'session-less' regarding the var
        # But 'SET LOCAL' lasts for the transaction.
        # Since we are in one session, we haven't set it yet.
        
        no_context_count = db.execute(text("SELECT count(*) FROM transactions")).scalar()
        print(f"Rows visible without context: {no_context_count}")
        
        # 3. Query WITH Context
        context_count = 0
        if valid_uid:
            # Set the RLS variable
            db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": valid_uid})
            
            # Query again
            context_count = db.execute(text("SELECT count(*) FROM transactions")).scalar()
            print(f"Rows visible with context ({valid_uid}): {context_count}")
            
        # Analysis
        if no_context_count > 0:
            if valid_uid and context_count == no_context_count:
                 print("STATUS: RLS INACTIVE (Rows visible without context, same count with context).")
            else:
                 print("STATUS: RLS INACTIVE (Rows visible without context).")
        elif no_context_count == 0 and context_count > 0:
            print("STATUS: RLS ACTIVE and WORKING (Hidden without context, visible with context).")
        elif no_context_count == 0 and context_count == 0:
            print("STATUS: INCONCLUSIVE (0 rows visible either way. Table might be empty or user has no data).")
        
    except Exception as e:
        print(f"Test failed with error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_rls()
