from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.utils import get_db
from backend.services.billing import create_portal_session
from backend.middleware.auth import get_current_user
from backend.models import User

router = APIRouter(prefix="/api/billing", tags=["billing"])

class PortalRequest(BaseModel):
    return_url: str

@router.post("/portal")
async def create_portal(
    request: PortalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe Customer Portal session.
    """
    url = create_portal_session(user.uid, db, request.return_url)
    return {"url": url}
