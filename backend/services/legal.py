"""Legal agreement acceptance helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Iterable

from fastapi import Request
from sqlalchemy.orm import Session

from backend.core.legal import resolve_agreement_version
from backend.models import LegalAgreementAcceptance
from backend.schemas.legal import AgreementAcceptancePayload


def _extract_request_meta(request: Request | None) -> tuple[str | None, str | None, str | None]:
    if not request:
        return None, None, None
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    locale = request.headers.get("accept-language")
    return ip_address, user_agent, locale


def record_agreement_acceptances(
    db: Session,
    *,
    uid: str,
    acceptances: Iterable[AgreementAcceptancePayload],
    request: Request | None = None,
    source: str = "frontend",
) -> list[LegalAgreementAcceptance]:
    created: list[LegalAgreementAcceptance] = []
    ip_address, user_agent, locale = _extract_request_meta(request)
    now = datetime.now(UTC)

    seen: set[tuple[str, str]] = set()

    for acceptance in acceptances:
        agreement_key = acceptance.agreement_key
        agreement_version = resolve_agreement_version(
            agreement_key, acceptance.agreement_version
        )
        if (agreement_key, agreement_version) in seen:
            continue
        seen.add((agreement_key, agreement_version))

        existing = (
            db.query(LegalAgreementAcceptance)
            .filter(
                LegalAgreementAcceptance.uid == uid,
                LegalAgreementAcceptance.agreement_key == agreement_key,
                LegalAgreementAcceptance.agreement_version == agreement_version,
            )
            .first()
        )
        if existing:
            continue

        entry = LegalAgreementAcceptance(
            uid=uid,
            agreement_key=agreement_key,
            agreement_version=agreement_version,
            acceptance_method=acceptance.acceptance_method or "clickwrap",
            presented_at=acceptance.presented_at or now,
            accepted_at=now,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent,
            locale=locale,
            metadata_json=acceptance.metadata or {},
        )
        db.add(entry)
        created.append(entry)

    if created:
        db.commit()
        for entry in created:
            db.refresh(entry)

    return created


def record_single_agreement(
    db: Session,
    *,
    uid: str,
    agreement_key: str,
    agreement_version: str | None = None,
    acceptance_method: str | None = None,
    request: Request | None = None,
    source: str = "frontend",
    metadata: dict | None = None,
) -> LegalAgreementAcceptance | None:
    acceptance = AgreementAcceptancePayload(
        agreement_key=agreement_key,
        agreement_version=agreement_version,
        acceptance_method=acceptance_method,
        metadata=metadata,
    )
    created = record_agreement_acceptances(
        db, uid=uid, acceptances=[acceptance], request=request, source=source
    )
    return created[0] if created else None
