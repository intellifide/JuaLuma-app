# CORE PURPOSE: Validate normalization helpers for merchants and categories.
# LAST MODIFIED: 2026-01-27

from backend.utils.normalization import (
    normalize_category,
    normalize_merchant_key,
    normalize_merchant_name,
)


def test_normalize_category_basic():
    assert normalize_category("  food  ") == "Food"
    assert normalize_category("Food and Drink") == "Food"
    assert normalize_category("credit card") == "Credit Card Payment"
    assert normalize_category("shopping") == "Shopping"


def test_normalize_category_empty():
    assert normalize_category("") is None
    assert normalize_category("   ") is None


def test_normalize_merchant_name_and_key():
    assert normalize_merchant_name("  ACME   Corp ") == "ACME Corp"
    assert normalize_merchant_key("  ACME   Corp ") == "acme corp"
    assert normalize_merchant_name("") is None
