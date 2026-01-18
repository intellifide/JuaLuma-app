import logging
import datetime
import json
from unittest.mock import MagicMock, patch
from datetime import UTC

from sqlalchemy import create_engine, Column, String, Float, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Setup Test Infrastructure
Base = declarative_base()

# 2. Define Test Model (Mocking LedgerHotEssential)
# Uses String for UUID fields to avoid SQLite issues
class TestLedgerHotEssential(Base):
    __tablename__ = "ledger_hot_essential"
    
    id = Column(String, primary_key=True)
    uid = Column(String, index=True)
    account_id = Column(String, index=True)
    ts = Column(DateTime)
    amount = Column(Float)
    currency = Column(String)
    category = Column(String)
    raw_json = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Setup in-memory DB
engine = create_engine("sqlite:///:memory:")
SessionLocalTest = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

def test_archiver_logic():
    # 3. Setup Test Data
    session = SessionLocalTest()
    
    # Row > 1 year old (Should be archived)
    old_date = datetime.datetime.now(UTC) - datetime.timedelta(days=400)
    # Remove tzinfo for sqlite storage if needed, but sqlalchemy handles it usually. 
    # Let's ensure it's naive or compatible.
    old_date_naive = old_date.replace(tzinfo=None)
    
    row_old = TestLedgerHotEssential(
        id="uuid-1",
        uid="user1",
        account_id="acc1",
        ts=old_date_naive,
        amount=100.0,
        currency="USD",
        category="Food",
        raw_json="{}"
    )
    
    # Row < 1 year old (Should stay)
    new_date = datetime.datetime.now(UTC) - datetime.timedelta(days=100)
    new_date_naive = new_date.replace(tzinfo=None)
    
    row_new = TestLedgerHotEssential(
        id="uuid-2",
        uid="user1",
        account_id="acc1",
        ts=new_date_naive,
        amount=50.0,
        currency="USD",
        category="Fun",
        raw_json="{}"
    )
    
    session.add(row_old)
    session.add(row_new)
    session.commit()
    session.close()

    # 4. Patch Dependencies
    # Patch the model class imported in the job to be our Test model
    # Patch the SessionLocal to return our test session
    # Patch storage client
    
    with patch("backend.jobs.archive_essential.LedgerHotEssential", TestLedgerHotEssential), \
         patch("backend.jobs.archive_essential.SessionLocal", side_effect=SessionLocalTest), \
         patch("backend.jobs.archive_essential.storage.Client") as MockStorageClient:
        
        # Mock bucket
        mock_bucket = MagicMock()
        MockStorageClient.return_value.bucket.return_value = mock_bucket
        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        
        # Helper to ensure timezone awareness in the job logic if it expects it
        # The job does: ts.astimezone(UTC) or replace...
        # Our test model stores naive timestamps in sqlite. 
        # But when queried, SQLAlchemy returns python datetime objects.
        # If they are naive, the job's logic "if ts.tzinfo is None: replace(tzinfo=UTC)" works perfectly.
        
        from backend.jobs.archive_essential import archive_essential_ledger
        
        # Run Archiver
        deleted_count = archive_essential_ledger(batch_size=10)
        
        # 5. Verify Results
        print(f"Deleted Rows: {deleted_count}")
        assert deleted_count == 1, f"Expected 1 deleted row, got {deleted_count}"
        
        # Verify GCS Upload
        assert mock_bucket.blob.called
        call_args = mock_bucket.blob.call_args[0][0]
        print(f"Uploaded Blob Name: {call_args}")
        
        # The path year should match the old_date year.
        # Since we used 400 days ago, it might be last year or the year before.
        expected_year = str(old_date.year)
        assert f"essential/user1/{expected_year}" in call_args
        
        # Verify DB State
        session = SessionLocalTest()
        remaining = session.query(TestLedgerHotEssential).all()
        print(f"Remaining Rows: {len(remaining)}")
        assert len(remaining) == 1
        assert remaining[0].category == "Fun"
        
        print("VERIFICATION SUCCESSFUL")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        test_archiver_logic()
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
