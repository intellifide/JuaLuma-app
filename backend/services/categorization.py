"""Categorization Service.

Handles 'machine learning' logic for transaction categorization logic.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models.category_rule import CategoryRule
from backend.models.transaction import Transaction
from backend.utils.normalization import (
    normalize_category,
    normalize_merchant_key,
    normalize_merchant_name,
)


def learn_rule(db: Session, uid: str, merchant_name: str, category: str):
    """
    Learn a categorization rule from a user manual override.

    If a rule for this merchant already exists, update it.
    Otherwise, create a new one.
    """
    normalized_name = normalize_merchant_name(merchant_name)
    normalized_category = normalize_category(category)
    if not normalized_name or not normalized_category:
        return

    # Normalize merchant name
    merchant_key = normalize_merchant_key(normalized_name)
    if not merchant_key:
        return

    rule = (
        db.query(CategoryRule)
        .filter(
            CategoryRule.uid == uid,
            func.lower(CategoryRule.merchant_name) == merchant_key,
        )
        .first()
    )

    if rule:
        rule.category = normalized_category
    else:
        rule = CategoryRule(
            uid=uid,
            merchant_name=normalized_name,
            category=normalized_category,
            match_type="exact",
        )
        db.add(rule)

    db.commit()


def predict_category(db: Session, uid: str, merchant_name: str) -> str | None:
    """
    Predict category for a given merchant name based on learned rules.
    """
    normalized_name = normalize_merchant_name(merchant_name)
    if not normalized_name:
        return None

    merchant_key = normalize_merchant_key(normalized_name)
    if not merchant_key:
        return None

    # Simple exact match (case-insensitive)
    rule = (
        db.query(CategoryRule)
        .filter(
            CategoryRule.uid == uid,
            func.lower(CategoryRule.merchant_name) == merchant_key,
        )
        .first()
    )

    if rule:
        return normalize_category(rule.category)

    return None


def apply_rule_to_history(db: Session, uid: str, merchant_name: str, category: str):
    """
    Apply a newly learned rule to all past transactions that are uncategorized
    or have a different category (optional, maybe too aggressive).

    For now, let's only update uncategorized ones to be safe.
    """
    normalized_name = normalize_merchant_name(merchant_name)
    normalized_category = normalize_category(category)
    if not normalized_name or not normalized_category:
        return

    merchant_key = normalize_merchant_key(normalized_name)
    if not merchant_key:
        return

    txns = (
        db.query(Transaction)
        .filter(
            Transaction.uid == uid,
            func.lower(Transaction.merchant_name) == merchant_key,
            Transaction.category.is_(None),  # Only uncategorized
        )
        .all()
    )

    for txn in txns:
        txn.category = normalized_category
        db.add(txn)

    db.commit()
