from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User
from backend.schemas.legal import AgreementAcceptancesRequest
from backend.services.legal import record_agreement_acceptances
from backend.utils import get_db

router = APIRouter(prefix="/api/legal", tags=["legal"])


@router.post("/accept", status_code=status.HTTP_201_CREATED)
def accept_legal_agreements(
    payload: AgreementAcceptancesRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    if not payload.agreements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No agreements provided.",
        )

    try:
        created = record_agreement_acceptances(
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
    return {"accepted": len(created)}
