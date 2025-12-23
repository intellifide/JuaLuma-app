
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.api.users import get_current_user
from backend.models import Household, HouseholdMember, User
from backend.services import household_service
from backend.utils import get_db

router = APIRouter(prefix="/api/households", tags=["households"])
logger = logging.getLogger(__name__)


# --- Schemas ---
class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)


class InviteRequest(BaseModel):
    email: EmailStr
    is_minor: bool = False


class InviteAccept(BaseModel):
    token: str


class HouseholdOut(BaseModel):
    id: str
    name: str
    owner_uid: str
    created_at: Any
    members: list[dict] = []
    invites: list[dict] = []


# --- Endpoints ---

@router.post("/", response_model=HouseholdOut)
def create_household(
    payload: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new household. Current user becomes Owner/Admin.
    """
    try:
        household = household_service.create_household(
            db, current_user.uid, payload.name
        )
        return _format_household_response(household)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error creating household: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create household.",
        )


@router.get("/me", response_model=HouseholdOut)
def get_my_household(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get details of the household the current user belongs to.
    """
    member = (
        db.query(HouseholdMember)
        .filter(HouseholdMember.uid == current_user.uid)
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="You are not in a household."
        )

    household = (
        db.query(Household).filter(Household.id == member.household_id).first()
    )

    # Permission check (optional, seeing your own household is usually allowed)
    if not member.can_view_household:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied."
        )

    return _format_household_response(household)


@router.post("/invites")
def create_invite(
    payload: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invite a member to the household (Admin only).
    """
    try:
        invite = household_service.invite_member(
            db, current_user.uid, payload.email, payload.is_minor
        )
        return {"message": "Invite sent", "invite_id": str(invite.id)}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error sending invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to send invite.")


@router.post("/invites/accept")
def accept_invite_endpoint(
    payload: InviteAccept,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept an invite using a token.
    """
    try:
        household_service.accept_invite(db, current_user.uid, payload.token)
        return {"message": "Joined household successfully."}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error accepting invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to join household.")


@router.delete("/members/me")
def leave_household_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Leave the current household (Breakup Protocol).
    """
    try:
        result = household_service.leave_household(db, current_user.uid)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error leaving household: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave household.")


# --- Helpers ---
def _format_household_response(household: Household) -> dict:
    return {
        "id": str(household.id),
        "name": household.name,
        "owner_uid": household.owner_uid,
        "created_at": household.created_at,
        "members": [
            {
                "uid": m.uid,
                "email": m.user.email if m.user else None,
                "role": m.role,
                "joined_at": m.joined_at,
                "ai_access_enabled": m.ai_access_enabled,
            }
            for m in household.members
        ],
        "invites": [
            {
                "email": i.email,
                "status": i.status,
                "created_at": i.created_at,
                "expires_at": i.expires_at,
            }
            for i in household.invites
            if i.status == "pending"  # Only show pending invites
        ],
    }
