"""
Centralized legal agreement definitions and helpers.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AgreementDefinition:
    key: str
    version: str
    title: str
    url: str | None = None
    versions: tuple[str, ...] | None = None

    def allowed_versions(self) -> tuple[str, ...]:
        if self.versions:
            return self.versions
        return (self.version,)


AGREEMENTS: dict[str, AgreementDefinition] = {
    "terms_of_service": AgreementDefinition(
        key="terms_of_service",
        version="2025-01-15",
        title="Terms of Service",
        url="/legal/terms",
    ),
    "privacy_policy": AgreementDefinition(
        key="privacy_policy",
        version="2025-01-15",
        title="Privacy Policy",
        url="/legal/privacy",
    ),
    "developer_agreement": AgreementDefinition(
        key="developer_agreement",
        version="2025-01-15",
        title="Developer Agreement",
        url="/legal/terms",
    ),
    "data_sharing_consent": AgreementDefinition(
        key="data_sharing_consent",
        version="2026-01-18",
        title="Household Data Sharing Consent",
        url=None,
    ),
    "ai_privacy_user_agreement": AgreementDefinition(
        key="ai_privacy_user_agreement",
        version="2025-01-15",
        title="AI Privacy & User Agreement",
        url=None,
    ),
}

REQUIRED_SIGNUP_AGREEMENTS = (
    "terms_of_service",
    "privacy_policy",
)
REQUIRED_DEVELOPER_AGREEMENTS = ("developer_agreement",)


def get_agreement_definition(key: str) -> AgreementDefinition | None:
    return AGREEMENTS.get(key)


def resolve_agreement_version(key: str, version: str | None) -> str:
    definition = get_agreement_definition(key)
    if not definition:
        raise ValueError(f"Unknown agreement key: {key}")
    resolved = version or definition.version
    if resolved not in definition.allowed_versions():
        raise ValueError(f"Unsupported agreement version for {key}: {resolved}")
    return resolved
