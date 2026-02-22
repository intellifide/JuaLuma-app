"""Pydantic schemas for legal agreement acceptance."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AgreementAcceptancePayload(BaseModel):
    agreement_key: str = Field(min_length=3, max_length=64)
    agreement_version: str | None = Field(default=None, max_length=64)
    acceptance_method: str | None = Field(default=None, max_length=32)
    presented_at: datetime | None = None
    metadata: dict[str, Any] | None = None


class AgreementAcceptancesRequest(BaseModel):
    agreements: list[AgreementAcceptancePayload] = Field(default_factory=list)

