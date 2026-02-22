"""Normalization helpers for merchants and categories."""

from __future__ import annotations

import re

_CANONICAL_CATEGORIES = [
    "Housing",
    "Transportation",
    "Food",
    "Utilities",
    "Insurance",
    "Healthcare",
    "Savings",
    "Personal",
    "Entertainment",
    "Other",
    "Income",
    "Transfer",
    "Groceries",
    "Dining",
    "Travel",
    "Education",
    "Shopping",
    "Credit Card Payment",
    "Investment",
]

_CATEGORY_KEY_MAP = {
    re.sub(r"[^a-z0-9]+", " ", category.lower()).strip(): category
    for category in _CANONICAL_CATEGORIES
}

_CATEGORY_ALIASES = {
    "food and drink": "Food",
    "food drink": "Food",
    "restaurants": "Dining",
    "restaurant": "Dining",
    "dining out": "Dining",
    "grocery": "Groceries",
    "groceries": "Groceries",
    "misc": "Other",
    "miscellaneous": "Other",
    "credit card": "Credit Card Payment",
    "credit card payment": "Credit Card Payment",
    "investments": "Investment",
    "income": "Income",
    "transfers": "Transfer",
    "transport": "Transportation",
}


def normalize_merchant_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    cleaned = re.sub(r"[\x00-\x1f]+", "", cleaned)
    return cleaned or None


def normalize_merchant_key(value: str | None) -> str | None:
    cleaned = normalize_merchant_name(value)
    if not cleaned:
        return None
    return re.sub(r"\s+", " ", cleaned.lower()).strip()


def normalize_category(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        return None
    key = re.sub(r"[^a-z0-9]+", " ", cleaned.lower()).strip()
    if not key:
        return None
    if key in _CATEGORY_ALIASES:
        return _CATEGORY_ALIASES[key]
    if key in _CATEGORY_KEY_MAP:
        return _CATEGORY_KEY_MAP[key]
    return cleaned.title()


__all__ = [
    "normalize_category",
    "normalize_merchant_key",
    "normalize_merchant_name",
]
