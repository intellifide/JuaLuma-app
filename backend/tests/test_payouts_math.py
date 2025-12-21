from decimal import Decimal

from backend.services.payouts import calculate_engagement_score, calculate_payout_share


def test_calculate_engagement_score_precision():
    # Test typical values
    downloads = 100
    rating = 4.5
    start_score = calculate_engagement_score(downloads, rating)
    assert start_score == Decimal("450.00")

    # Test float precision handling
    # 3.33333... * 3 should be 10.00 roughly, but we check specific rounding behavior
    downloads = 3
    rating = 3.333333333
    score = calculate_engagement_score(downloads, rating)
    # 3 * 3.333333333 = 9.999999999 -> rounds to 10.00
    assert score == Decimal("10.00")

    # Test edge case
    downloads = 0
    rating = 5.0
    assert calculate_engagement_score(downloads, rating) == Decimal("0.00")


def test_calculate_payout_share_exact():
    # Scenario: 2 developers.
    # Dev A: Score 100
    # Dev B: Score 300
    # Total Score: 400
    # Pool: $1000.00

    score_a = Decimal("100.00")
    total_score = Decimal("400.00")
    pool = Decimal("1000.00")

    payout_a = calculate_payout_share(score_a, total_score, pool)
    # Expected: 1/4 of 1000 = 250.00
    assert payout_a == Decimal("250.00")

    # Test rounding splits
    # Pool $100.00, 3 equal shares (33.333...)
    score_x = Decimal("1.00")
    total_x = Decimal("3.00")
    pool_x = Decimal("100.00")

    payout_x = calculate_payout_share(score_x, total_x, pool_x)
    assert payout_x == Decimal("33.33")
