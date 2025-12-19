from fastmcp import FastMCP
import logging

from backend.models import User, Transaction, Subscription, Account
from backend.models.base import SessionLocal
from sqlalchemy import func

# Initialize the Main App MCP server
mcp = FastMCP("jualuma App")
logger = logging.getLogger(__name__)

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@mcp.tool()
def get_user_by_email(email: str) -> str:
    """Retrieve user details by email address (Read-Only)."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return "User not found"
        return f"User: {user.full_name} (ID: {user.uid}, Role: {user.role})"
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return f"Error: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def list_recent_transactions(uid: str, limit: int = 5) -> str:
    """List recent transactions for a user."""
    db = SessionLocal()
    try:
        txs = db.query(Transaction).filter(Transaction.user_id == uid).order_by(Transaction.date.desc()).limit(limit).all()
        if not txs:
            return "No transactions found."
        
        result = [f"DATE: {t.date} | {t.description} | ${t.amount}" for t in txs]
        return "\n".join(result)
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return f"Error: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def get_subscription_status(uid: str) -> str:
    """Check the current subscription plan and status for a user."""
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.uid == uid).first()
        if not sub:
            return "No subscription found (Default: Free)"
        return f"Plan: {sub.plan}, Status: {sub.status}, Renews: {sub.renew_at}"
    except Exception as e:
        logger.error(f"Error fetching subscription: {e}")
        return f"Error: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def list_accounts(uid: str) -> str:
    """List all connected financial accounts for a user."""
    db = SessionLocal()
    try:
        accounts = db.query(Account).filter(Account.uid == uid).all()
        if not accounts:
            return "No accounts linked."
        
        result = [f"{acc.id}: {acc.name} ({acc.type}) - ****{acc.mask}" for acc in accounts]
        return "\n".join(result)
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
        return f"Error: {str(e)}"
    finally:
        db.close()

@mcp.tool()
def analyze_spending(uid: str, days: int = 30) -> str:
    """Analyze spending by category for the last N days."""
    db = SessionLocal()
    try:
        # Calculate spending by category
        from datetime import datetime, timedelta
        cutoff = datetime.now() - timedelta(days=days)
        
        results = db.query(
            Transaction.category, 
            func.sum(Transaction.amount)
        ).filter(
            Transaction.user_id == uid,
            Transaction.date >= cutoff
        ).group_by(Transaction.category).all()
        
        if not results:
            return f"No spending data found for the last {days} days."
            
        report = [f"Spending Report ({days} days):"]
        for cat, amount in results:
            report.append(f"- {cat or 'Uncategorized'}: ${amount:.2f}")
            
        return "\n".join(report)
    except Exception as e:
        logger.error(f"Error analyzing spending: {e}")
        return f"Error: {str(e)}"
    finally:
        db.close()
