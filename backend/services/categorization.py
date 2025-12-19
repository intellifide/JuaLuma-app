"""Categorization Service.

Handles 'machine learning' logic for transaction categorization logic.
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.category_rule import CategoryRule
from backend.models.transaction import Transaction

def learn_rule(db: Session, uid: str, merchant_name: str, category: str):
    """
    Learn a categorization rule from a user manual override.
    
    If a rule for this merchant already exists, update it.
    Otherwise, create a new one.
    """
    if not merchant_name or not category:
        return

    # Normalize merchant name
    merchant_key = merchant_name.strip().lower()

    rule = db.query(CategoryRule).filter(
        CategoryRule.uid == uid,
        func.lower(CategoryRule.merchant_name) == merchant_key
    ).first()

    if rule:
        rule.category = category
    else:
        rule = CategoryRule(
            uid=uid,
            merchant_name=merchant_name.strip(), # Keep original casing for display if needed
            category=category,
            match_type="exact"
        )
        db.add(rule)
    
    db.commit()

def predict_category(db: Session, uid: str, merchant_name: str) -> Optional[str]:
    """
    Predict category for a given merchant name based on learned rules.
    """
    if not merchant_name:
        return None
    
    merchant_key = merchant_name.strip().lower()

    # Simple exact match (case-insensitive)
    rule = db.query(CategoryRule).filter(
        CategoryRule.uid == uid,
        func.lower(CategoryRule.merchant_name) == merchant_key
    ).first()

    if rule:
        return rule.category
    
    return None

def apply_rule_to_history(db: Session, uid: str, merchant_name: str, category: str):
    """
    Apply a newly learned rule to all past transactions that are uncategorized 
    or have a different category (optional, maybe too aggressive).
    
    For now, let's only update uncategorized ones to be safe.
    """
    merchant_key = merchant_name.strip().lower()
    
    txns = db.query(Transaction).filter(
        Transaction.uid == uid,
        func.lower(Transaction.merchant_name) == merchant_key,
        Transaction.category.is_(None) # Only uncategorized
    ).all()

    for txn in txns:
        txn.category = category
        db.add(txn)
    
    db.commit()
