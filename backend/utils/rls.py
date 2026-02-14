from sqlalchemy import text
from sqlalchemy.orm import Session


def set_db_user_context(db: Session, user_id: str):
    """
    Sets the app.current_user_id setting in the PostgreSQL session.
    This is used by Row Level Security (RLS) policies to isolate data access.
    
    Args:
        db: The SQLAlchemy database session.
        user_id: The unique identifier of the user (e.g., Firebase UID).
    """
    # Use 'LOCAL' to ensure the setting only persists for the current transaction
    # 'true' in current_setting() in the policy handles cases where this isn't set (returns NULL)
    stmt = text("SET LOCAL app.current_user_id = :user_id")
    db.execute(stmt, {"user_id": user_id})
