# CORE PURPOSE: API endpoints for household management and invite system.
# LAST MODIFIED: 2026-01-18 00:40 CST

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.api.users import get_current_user
from backend.models import Household, HouseholdMember, User
from backend.services import household_service
from backend.services.legal import record_single_agreement
from backend.utils import get_db

router = APIRouter(prefix="/api/households", tags=["households"])
logger = logging.getLogger(__name__)


# --- Schemas ---
class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)


class InviteRequest(BaseModel):
    email: EmailStr
    is_minor: bool = False
    can_view_household: bool = True


class InviteAccept(BaseModel):
    token: str
    consent_agreed: bool


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
            detail="We encountered an issue creating your household. Please try again later.",
        ) from e


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
            status_code=status.HTTP_404_NOT_FOUND, detail="No household was found for your account."
        )

    household = (
        db.query(Household).filter(Household.id == member.household_id).first()
    )

    # Permission check (optional, seeing your own household is usually allowed)
    if not member.can_view_household:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this household."
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
            db, current_user.uid, payload.email, payload.is_minor, payload.can_view_household
        )
        return {"message": "Invite sent", "invite_id": str(invite.id)}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error sending invite: {e}")
        raise HTTPException(status_code=500, detail="We could not send the invite at this time. Please try again later.") from e


@router.get("/invites/{token}")
def check_invite_status(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Public Endpoint: Check if an invite token is valid.
    Returns the associated email and whether a user exists.
    Does NOT require authentication (allowing flow for new users).
    """
    info = household_service.get_invite_details(db, token)
    if not info["valid"]:
        raise HTTPException(status_code=400, detail=info["detail"])
    
    return info


@router.post("/invites/accept")
def accept_invite_endpoint(
    payload: InviteAccept,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept an invite using a token.
    """
    if not payload.consent_agreed:
        raise HTTPException(
            status_code=400,
            detail="You must agree to the data sharing terms to join the household."
        )

    try:
        member = household_service.accept_invite(db, current_user.uid, payload.token)
        record_single_agreement(
            db,
            uid=current_user.uid,
            agreement_key="data_sharing_consent",
            acceptance_method="clickwrap",
            request=request,
            source="frontend",
            metadata={"household_id": str(member.household_id)},
        )
        return {"message": "Joined household successfully."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error accepting invite: {e}")
        raise HTTPException(status_code=500, detail="We encountered an issue joining the household. Please try again later.") from e


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
        raise HTTPException(status_code=500, detail="We encountered an issue while processing your request to leave the household.") from e


# Remove a member from the household (Admin only).
@router.delete("/members/{member_uid}")
def remove_member_endpoint(
    member_uid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a household member (Admin only).
    """
    try:
        result = household_service.remove_member(db, current_user.uid, member_uid)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error removing household member: {e}")
        raise HTTPException(
            status_code=500, detail="We could not remove the member at this time. Please try again later."
        ) from e


# Cancel a pending invite (Admin only).
@router.delete("/invites/{invite_id}")
def cancel_invite_endpoint(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending household invite (Admin only).
    """
    try:
        result = household_service.cancel_invite(db, current_user.uid, invite_id)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error cancelling household invite: {e}")
        raise HTTPException(status_code=500, detail="We could not cancel the invite at this time. Please try again later.") from e


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
                "first_name": m.user.first_name if m.user else None,
                "last_name": m.user.last_name if m.user else None,
                "username": m.user.username if m.user else None,
                "role": m.role,
                "joined_at": m.joined_at,
                "ai_access_enabled": m.ai_access_enabled,
                "can_view_household": m.can_view_household,
            }
            for m in household.members
        ],
        "invites": [
            {
                "id": str(i.id),
                "email": i.email,
                "status": i.status,
                "created_at": i.created_at,
                "expires_at": i.expires_at,
                "can_view_household": i.can_view_household,
            }
            for i in household.invites
            if i.status == "pending"  # Only show pending invites
        ],
    }
