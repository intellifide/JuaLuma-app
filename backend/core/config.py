# Updated 2025-12-11 01:25 CST by ChatGPT
"""
Centralized application configuration using pydantic-settings.

This module validates required environment variables at import time and exposes
the shared `settings` instance for the rest of the backend to consume.
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Validated configuration for the jualuma backend."""

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
    cors_origins_raw: str | None = Field(default=None, alias="BACKEND_CORS_ORIGINS")
    rate_limit_max_requests: int = Field(default=100, alias="RATE_LIMIT_MAX_REQUESTS")
    rate_limit_window_seconds: int = Field(
        default=60, alias="RATE_LIMIT_WINDOW_SECONDS"
    )

    database_url: str = Field(..., alias="DATABASE_URL")

    plaid_client_id: str = Field(..., alias="PLAID_CLIENT_ID")
    plaid_secret: str = Field(..., alias="PLAID_SECRET")
    plaid_env: str = Field(default="sandbox", alias="PLAID_ENV")

    firebase_project_id: str = Field(
        default="jualuma-local", alias="FIREBASE_PROJECT_ID"
    )
    firebase_api_key: str | None = Field(default=None, alias="VITE_FIREBASE_API_KEY")
    firebase_auth_emulator_host: str | None = Field(
        default=None, alias="FIREBASE_AUTH_EMULATOR_HOST"
    )
    firestore_emulator_host: str | None = Field(
        default=None, alias="FIRESTORE_EMULATOR_HOST"
    )
    firestore_healthcheck_enabled: bool = Field(
        default=False, alias="FIRESTORE_HEALTHCHECK_ENABLED"
    )
    pubsub_emulator_host: str | None = Field(default=None, alias="PUBSUB_EMULATOR_HOST")

    stripe_secret_key: str | None = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str | None = Field(
        default=None, alias="STRIPE_WEBHOOK_SECRET"
    )
    stripe_publishable_key: str | None = Field(
        default=None, alias="STRIPE_PUBLISHABLE_KEY"
    )

    ai_studio_api_key: str | None = Field(default=None, alias="AI_STUDIO_API_KEY")
    ai_model_local: str = Field(default="gemini-2.5-flash", alias="AI_MODEL_LOCAL")
    ai_model_prod: str = Field(default="gemini-2.5-flash", alias="AI_MODEL_PROD")

    gcp_project_id: str | None = Field(default=None, alias="GCP_PROJECT_ID")
    gcp_location: str = Field(default="us-central1", alias="GCP_LOCATION")
    service_name: str = Field(default="jualuma-backend", alias="SERVICE_NAME")
    secret_provider: str | None = Field(default=None, alias="SECRET_PROVIDER")
    local_secret_store_path: str | None = Field(
        default=None, alias="LOCAL_SECRET_STORE_PATH"
    )
    encryption_provider: str | None = Field(
        default=None, alias="ENCRYPTION_PROVIDER"
    )
    gcp_kms_key_name: str | None = Field(default=None, alias="GCP_KMS_KEY_NAME")
    local_encryption_key: str | None = Field(default=None, alias="LOCAL_ENCRYPTION_KEY")

    # Email / SMTP Config
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int | None = Field(default=587, alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(
        default="no-reply@jualuma.com", alias="SMTP_FROM_EMAIL"
    )

    # Web3 / RPC Configuration
    eth_rpc_url: str = Field(default="https://cloudflare-eth.com", alias="ETH_RPC_URL")
    polygon_rpc_url: str = Field(default="https://polygon-rpc.com", alias="POLYGON_RPC_URL")
    bsc_rpc_url: str = Field(default="https://bsc-dataseed.binance.org/", alias="BSC_RPC_URL")
    bitcoin_api_url: str = Field(default="https://blockstream.info/api", alias="BITCOIN_API_URL")
    solana_rpc_url: str = Field(default="https://api.mainnet-beta.solana.com", alias="SOLANA_RPC_URL")
    ripple_rpc_url: str = Field(default="https://s2.ripple.com:51234", alias="RIPPLE_RPC_URL")
    cardano_api_url: str = Field(default="https://api.koios.rest/api/v1", alias="CARDANO_API_URL")
    tron_api_url: str = Field(default="https://api.trongrid.io", alias="TRON_API_URL")

    # Testmail Config (for development testing)
    testmail_api_key: str | None = Field(default=None, alias="TESTMAIL_API_KEY")
    testmail_namespace: str | None = Field(default=None, alias="TESTMAIL_NAMESPACE")

    # Connector Overrides
    force_real_connectors: bool = Field(default=False, alias="FORCE_REAL_CONNECTORS")

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
        """
        Comma-separated CORS origins from BACKEND_CORS_ORIGINS.
        Falls back to the single configured frontend URL.
        Rejects wildcards to fail safe by default.
        """
        if self.cors_origins_raw:
            candidates = [
                origin.strip()
                for origin in self.cors_origins_raw.split(",")
                if origin.strip()
            ]
            if any(origin == "*" for origin in candidates):
                raise ValueError("BACKEND_CORS_ORIGINS cannot contain '*'.")
            return candidates

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
