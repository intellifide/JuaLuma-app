"""Manual assets and liabilities API."""

# Last Updated: 2026-01-27

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models.manual_asset import ManualAsset
from backend.models.user import User
from backend.utils import get_db

router = APIRouter(prefix="/api/manual-assets", tags=["manual-assets"])

_ALLOWED_ASSET_TYPES = {"house", "car", "collectible", "real_estate"}
_ALLOWED_BALANCE_TYPES = {"asset", "liability"}


class ManualAssetBase(BaseModel):
    asset_type: str = Field(description="Category for the manual asset/liability.")
    balance_type: str = Field(default="asset", description="asset or liability")
    name: str = Field(max_length=256)
    value: Decimal = Field(ge=0)
    purchase_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in _ALLOWED_ASSET_TYPES:
            raise ValueError(f"asset_type must be one of {sorted(_ALLOWED_ASSET_TYPES)}")
        return normalized

    @field_validator("balance_type")
    @classmethod
    def validate_balance_type(cls, value: str) -> str:
        normalized = value.lower()
        if normalized not in _ALLOWED_BALANCE_TYPES:
            raise ValueError("balance_type must be 'asset' or 'liability'")
        return normalized


class ManualAssetCreate(ManualAssetBase):
    pass


class ManualAssetUpdate(BaseModel):
    asset_type: str | None = None
    balance_type: str | None = None
    name: str | None = None
    value: Decimal | None = Field(default=None, ge=0)
    purchase_date: date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def ensure_update_fields(self) -> "ManualAssetUpdate":
        if (
            self.asset_type is None
            and self.balance_type is None
            and self.name is None
            and self.value is None
            and self.purchase_date is None
            and self.notes is None
        ):
            raise ValueError("Provide at least one field to update.")
        return self

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.lower()
        if normalized not in _ALLOWED_ASSET_TYPES:
            raise ValueError(f"asset_type must be one of {sorted(_ALLOWED_ASSET_TYPES)}")
        return normalized

    @field_validator("balance_type")
    @classmethod
    def validate_balance_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.lower()
        if normalized not in _ALLOWED_BALANCE_TYPES:
            raise ValueError("balance_type must be 'asset' or 'liability'")
        return normalized


class ManualAssetResponse(BaseModel):
    id: uuid.UUID
    uid: str
    asset_type: str
    balance_type: str
    name: str
    value: Decimal
    purchase_date: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _serialize_asset(asset: ManualAsset) -> dict[str, Any]:
    return asset.to_dict()


@router.get("", response_model=list[ManualAssetResponse])
def list_manual_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    assets = (
        db.query(ManualAsset)
        .filter(ManualAsset.uid == current_user.uid)
        .order_by(ManualAsset.created_at.desc())
        .all()
    )
    return [_serialize_asset(asset) for asset in assets]


@router.post("", response_model=ManualAssetResponse, status_code=status.HTTP_201_CREATED)
def create_manual_asset(
    payload: ManualAssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    asset = ManualAsset(
        uid=current_user.uid,
        asset_type=payload.asset_type,
        balance_type=payload.balance_type,
        name=payload.name,
        value=payload.value,
        purchase_date=payload.purchase_date,
        notes=payload.notes,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset)


@router.patch("/{asset_id}", response_model=ManualAssetResponse)
def update_manual_asset(
    asset_id: uuid.UUID,
    payload: ManualAssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    asset = (
        db.query(ManualAsset)
        .filter(ManualAsset.id == asset_id, ManualAsset.uid == current_user.uid)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual asset not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manual_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    asset = (
        db.query(ManualAsset)
        .filter(ManualAsset.id == asset_id, ManualAsset.uid == current_user.uid)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual asset not found.")

    db.delete(asset)
    db.commit()
