# Updated 2025-12-11 01:25 CST by ChatGPT
"""
Centralized application configuration using pydantic-settings.

This module validates required environment variables at import time and exposes
the shared `settings` instance for the rest of the backend to consume.
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Validated configuration for the Finity backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = Field(default="local", alias="APP_ENV")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8001, alias="API_PORT")
    frontend_url: str = Field(default="http://localhost:5175", alias="FRONTEND_URL")

    database_url: str = Field(..., alias="DATABASE_URL")

    plaid_client_id: str = Field(..., alias="PLAID_CLIENT_ID")
    plaid_secret: str = Field(..., alias="PLAID_SECRET")
    plaid_env: str = Field(default="sandbox", alias="PLAID_ENV")

    firebase_project_id: str = Field(default="finity-local", alias="FIREBASE_PROJECT_ID")
    firebase_auth_emulator_host: str | None = Field(
        default=None, alias="FIREBASE_AUTH_EMULATOR_HOST"
    )
    firestore_emulator_host: str | None = Field(
        default=None, alias="FIRESTORE_EMULATOR_HOST"
    )
    firestore_healthcheck_enabled: bool = Field(
        default=False, alias="FIRESTORE_HEALTHCHECK_ENABLED"
    )

    ai_studio_api_key: str | None = Field(default=None, alias="AI_STUDIO_API_KEY")
    gcp_project_id: str | None = Field(default=None, alias="GCP_PROJECT_ID")
    gcp_location: str = Field(default="us-central1", alias="GCP_LOCATION")
    service_name: str = Field(default="finity-backend", alias="SERVICE_NAME")

    @field_validator("database_url", "plaid_client_id", "plaid_secret", "frontend_url")
    @classmethod
    def _require_non_empty(cls, value: str, info):
        if not value or (isinstance(value, str) and not value.strip()):
            raise ValueError(f"{info.field_name} cannot be empty.")
        return value

    @field_validator("plaid_env")
    @classmethod
    def _normalize_plaid_env(cls, value: str) -> str:
        allowed = {"sandbox", "production", "prod", "development", "dev"}
        normalized = value.lower()
        if normalized not in allowed:
            raise ValueError(
                "PLAID_ENV must be one of: sandbox, development/dev, production/prod."
            )
        return normalized

    @property
    def is_local(self) -> bool:
        return self.app_env.lower() == "local"

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_url]

    @property
    def resolved_auth_emulator_host(self) -> str | None:
        if self.firebase_auth_emulator_host:
            return self.firebase_auth_emulator_host
        if self.is_local:
            return "localhost:9099"
        return None

    @property
    def resolved_firestore_host(self) -> str | None:
        if self.firestore_emulator_host:
            return self.firestore_emulator_host
        if self.is_local:
            return "localhost:8080"
        return None


settings = AppSettings()

__all__ = ["AppSettings", "settings"]
