
from decimal import Decimal, ROUND_HALF_UP

def calculate_engagement_score(downloads: int, average_rating: float) -> Decimal:
    """
    Calculates the developer engagement score based on downloads and rating.
    Formula: Engagement Score = Downloads * Average Rating Score
    """
    # Convert inputs to Decimal for precision
    d_downloads = Decimal(downloads)
    d_rating = Decimal(str(average_rating)) # Convert float to string first to avoid precision issues
    
    score = d_downloads * d_rating
    return score.quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)

def calculate_payout_share(engagement_score: Decimal, total_pool_score: Decimal, total_payout_pool: Decimal) -> Decimal:
    """
    Calculates the monetary payout based on the share of the total pool.
    Share = (Engagement Score / Total Pool Score) * Total Payout Pool
    """
    if total_pool_score == 0:
        return Decimal("0.00")
        
    share_ratio = engagement_score / total_pool_score
    payout = share_ratio * total_payout_pool
    
    # Currency usually needs 2 decimal places
    return payout.quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)
