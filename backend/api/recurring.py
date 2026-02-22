"""Core Purpose: API endpoints for recurring transaction detection."""

# Last Updated: 2026-01-28 12:05 CST

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User
from backend.services.recurring import get_recurring_forecast
from backend.utils import get_db

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


class RecurringForecastResponse(BaseModel):
    merchant: str
    category: str | None = None
    average_amount: float = Field(..., ge=0)
    cadence: str
    cadence_days: int = Field(..., ge=1)
    next_date: date
    last_date: date
    occurrence_count: int = Field(..., ge=1)
    confidence: float = Field(..., ge=0, le=1)


@router.get("/forecast", response_model=list[RecurringForecastResponse])
def forecast_recurring(
    lookahead_days: int = Query(30, ge=7, le=90),
    lookback_days: int = Query(180, ge=60, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recurring bill forecasts within the lookahead window."""
    forecast = get_recurring_forecast(
        db,
        current_user.uid,
        lookahead_days=lookahead_days,
        lookback_days=lookback_days,
    )
    return [
        RecurringForecastResponse(
            merchant=item.merchant,
            category=item.category,
            average_amount=item.average_amount,
            cadence=item.cadence,
            cadence_days=item.cadence_days,
            next_date=item.next_date,
            last_date=item.last_date,
            occurrence_count=item.occurrence_count,
            confidence=item.confidence,
        )
        for item in forecast
    ]
