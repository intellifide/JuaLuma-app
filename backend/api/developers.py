import logging
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from backend.core.dependencies import require_developer
from backend.core.legal import REQUIRED_DEVELOPER_AGREEMENTS
from backend.middleware.auth import get_current_user
from backend.models import DeveloperPayout, User
from backend.schemas.legal import AgreementAcceptancePayload
from backend.services.legal import record_agreement_acceptances
from backend.utils import get_db

router = APIRouter(prefix="/api/developers", tags=["developers"])
logger = logging.getLogger(__name__)


@router.get("/sdk", response_class=FileResponse)
def download_sdk():
    """Download the latest jualuma Widget SDK."""
    # Resolve path relative to this file (backend/api/developers.py)
    # Target: backend/static/sdk-latest.zip
    base_dir = Path(__file__).resolve().parent.parent  # backend/
    file_path = base_dir / "static" / "sdk-latest.zip"

    if not file_path.exists():
        logger.error(f"SDK file not found at: {file_path}")
        raise HTTPException(status_code=404, detail="The developer SDK package is temporarily unavailable.")

    return FileResponse(
        path=file_path, media_type="application/zip", filename="jualuma-widget-sdk.zip"
    )


class PayoutResponse(BaseModel):
    month: date
    gross_revenue: Decimal
    payout_status: str


    model_config = ConfigDict(from_attributes=True)



class PaginatedPayoutResponse(BaseModel):
    data: list[PayoutResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)


@router.get("/payouts", response_model=list[PayoutResponse])
def get_payout_history(
    current_user: User = Depends(require_developer), db: Session = Depends(get_db)
) -> list[DeveloperPayout]:
    """Get payout history for the authenticated developer."""

    payouts = (
        db.query(DeveloperPayout)
        .filter(DeveloperPayout.dev_uid == current_user.uid)
        .order_by(DeveloperPayout.month.desc())
        .all()
    )
    return payouts


@router.get("/transactions", response_model=PaginatedPayoutResponse)
def get_developer_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Get paginated developer transactions (payouts)."""
    query = (
        db.query(DeveloperPayout)
        .filter(DeveloperPayout.dev_uid == current_user.uid)
        .order_by(DeveloperPayout.month.desc())
    )

    total = query.count()
    payouts = query.offset((page - 1) * page_size).limit(page_size).all()

    return {"data": payouts, "total": total, "page": page, "page_size": page_size}


class DeveloperCreate(BaseModel):
    payout_method: dict[str, Any]
    payout_frequency: str = "monthly"
    agreements: list[AgreementAcceptancePayload] = Field(default_factory=list)


@router.post("/", status_code=status.HTTP_201_CREATED)
def register_developer(
    payload: DeveloperCreate,
    request: Request,
    current_user: User = Depends(
        get_current_user
    ),  # Any authenticated user can register
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Register as a developer. Requires Pro/Ultimate."""
    if current_user.developer:
        raise HTTPException(status_code=400, detail="You are already registered as a developer.")

    from backend.models.developer import Developer

    required_keys = set(REQUIRED_DEVELOPER_AGREEMENTS)
    accepted_keys = {agreement.agreement_key for agreement in payload.agreements}
    missing = required_keys - accepted_keys
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required legal agreements: {', '.join(sorted(missing))}.",
        )

    try:
        record_agreement_acceptances(
            db,
            uid=current_user.uid,
            acceptances=payload.agreements,
            request=request,
            source="frontend",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    dev = Developer(
        uid=current_user.uid,
        payout_method=payload.payout_method,
        payout_frequency=payload.payout_frequency,
    )
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return {"message": "Developer registered successfully"}
