# Core Purpose: Centralized application configuration using pydantic-settings.
# Last Updated: 2026-01-23 22:39 CST
"""
This module validates required environment variables at import time and exposes
the shared `settings` instance for the rest of the backend to consume.
"""

from pydantic import Field, field_validator, model_validator
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
    # Frontend loads can fan out into multiple concurrent API calls; 100/min was too easy
    # to hit during normal tab switching in dev. Still configurable via env.
    rate_limit_max_requests: int = Field(default=250, alias="RATE_LIMIT_MAX_REQUESTS")
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
    google_cloud_project: str | None = Field(
        default=None, alias="GOOGLE_CLOUD_PROJECT"
    )
    firebase_api_key: str | None = Field(default=None, alias="VITE_FIREBASE_API_KEY")
    firebase_emulator_enabled: bool | None = Field(
        default=None, alias="FIREBASE_EMULATOR_ENABLED"
    )
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
    pubsub_emulator_enabled: bool | None = Field(
        default=None, alias="PUBSUB_EMULATOR_ENABLED"
    )

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

    # Job runner auth (Cloud Scheduler / Cloud Run Jobs style)
    # In production, require a secret header to trigger internal scheduled tasks.
    job_runner_secret: str | None = Field(default=None, alias="JOB_RUNNER_SECRET")

    # Email / SMTP Config
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int | None = Field(default=587, alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(
        default="no-reply@jualuma.com", alias="SMTP_FROM_EMAIL"
    )
    support_email: str = Field(default="intellifidellc@gmail.com", alias="SUPPORT_EMAIL")
    developer_email: str | None = Field(default=None, alias="DEVELOPER_EMAIL")

    # Web3 / RPC Configuration
    eth_rpc_url: str = Field(default="https://cloudflare-eth.com", alias="ETH_RPC_URL")
    polygon_rpc_url: str = Field(default="https://polygon-rpc.com", alias="POLYGON_RPC_URL")
    bsc_rpc_url: str = Field(default="https://bsc-dataseed.binance.org/", alias="BSC_RPC_URL")
    bitcoin_api_url: str = Field(default="https://blockstream.info/api", alias="BITCOIN_API_URL")
    solana_rpc_url: str = Field(default="https://api.mainnet-beta.solana.com", alias="SOLANA_RPC_URL")
    ripple_rpc_url: str = Field(default="https://s2.ripple.com:51234", alias="RIPPLE_RPC_URL")
    cardano_api_url: str = Field(default="https://api.koios.rest/api/v1", alias="CARDANO_API_URL")
    tron_api_url: str = Field(default="https://api.trongrid.io", alias="TRON_API_URL")
    etherscan_api_key: str | None = Field(default=None, alias="ETHERSCAN_API_KEY")
    etherscan_base_url: str = Field(
        default="https://api.etherscan.io/api", alias="ETHERSCAN_BASE_URL"
    )
    polygonscan_api_key: str | None = Field(default=None, alias="POLYGONSCAN_API_KEY")
    polygonscan_base_url: str = Field(
        default="https://api.polygonscan.com/api", alias="POLYGONSCAN_BASE_URL"
    )
    bscscan_api_key: str | None = Field(default=None, alias="BSCSCAN_API_KEY")
    bscscan_base_url: str = Field(
        default="https://api.bscscan.com/api", alias="BSCSCAN_BASE_URL"
    )
    helius_api_key: str | None = Field(default=None, alias="HELIUS_API_KEY")
    helius_base_url: str = Field(
        default="https://mainnet.helius-rpc.com", alias="HELIUS_BASE_URL"
    )
    helius_rpc_url: str | None = Field(default=None, alias="HELIUS_RPC_URL")
    bitquery_api_key: str | None = Field(default=None, alias="BITQUERY_API_KEY")
    bitquery_url: str = Field(
        default="https://streaming.bitquery.io/graphql", alias="BITQUERY_URL"
    )
    blockchain_com_url: str = Field(
        default="https://blockchain.info", alias="BLOCKCHAIN_COM_URL"
    )
    blockfrost_api_key: str | None = Field(default=None, alias="BLOCKFROST_API_KEY")
    blockfrost_url_mainnet: str = Field(
        default="https://cardano-mainnet.blockfrost.io/api/v0",
        alias="BLOCKFROST_URL_MAINNET",
    )
    xrpscan_url: str = Field(default="https://xrpscan.com/api/v1", alias="XRPSCAN_URL")
    tronscan_base_url: str = Field(
        default="https://api.tronscanapi.com", alias="TRONSCAN_BASE_URL"
    )
    trongrid_api_key: str | None = Field(default=None, alias="TRONGRID_API_KEY")
    trongrid_url: str = Field(
        default="https://api.trongrid.io/v1", alias="TRONGRID_URL"
    )

    # Testmail Config (for development testing)
    testmail_api_key: str | None = Field(default=None, alias="TESTMAIL_API_KEY")
    testmail_namespace: str | None = Field(default=None, alias="TESTMAIL_NAMESPACE")

    # SMS Config
    sms_provider: str | None = Field(default=None, alias="SMS_PROVIDER")
    twilio_account_sid: str | None = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_from_number: str | None = Field(default=None, alias="TWILIO_FROM_NUMBER")

    # Push Config
    push_provider: str | None = Field(default=None, alias="PUSH_PROVIDER")
    fcm_server_key: str | None = Field(default=None, alias="FCM_SERVER_KEY")

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

    @model_validator(mode="after")
    def _normalize_project_ids(self) -> "AppSettings":
        resolved = self.gcp_project_id or self.google_cloud_project or self.firebase_project_id
        if resolved:
            if not self.gcp_project_id:
                self.gcp_project_id = resolved
            if not self.google_cloud_project:
                self.google_cloud_project = resolved
            if not self.firebase_project_id:
                self.firebase_project_id = resolved
        return self

    @property
    def is_local(self) -> bool:
        return self.app_env.lower() in {"local", "test"}

    @property
    def resolved_gcp_project_id(self) -> str | None:
        return self.gcp_project_id or self.google_cloud_project or self.firebase_project_id

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
        if not self.firebase_emulator_enabled_effective:
            return None
        if self.firebase_auth_emulator_host:
            return self.firebase_auth_emulator_host
        if self.is_local:
            return "localhost:9099"
        return None

    @property
    def resolved_firestore_host(self) -> str | None:
        if not self.firebase_emulator_enabled_effective:
            return None
        if self.firestore_emulator_host:
            return self.firestore_emulator_host
        if self.is_local:
            return "localhost:8080"
        return None

    @property
    def firebase_emulator_enabled_effective(self) -> bool:
        if self.firebase_emulator_enabled is not None:
            return self.firebase_emulator_enabled
        return self.is_local

    @property
    def pubsub_emulator_enabled_effective(self) -> bool:
        if self.pubsub_emulator_enabled is not None:
            return self.pubsub_emulator_enabled
        return self.is_local

    @property
    def resolved_pubsub_emulator_host(self) -> str | None:
        if not self.pubsub_emulator_enabled_effective:
            return None
        if self.pubsub_emulator_host:
            return self.pubsub_emulator_host
        if self.is_local:
            return "localhost:8085"
        return None


settings = AppSettings()

BITQUERY_URL = settings.bitquery_url
BITQUERY_API_KEY = settings.bitquery_api_key

__all__ = ["AppSettings", "settings", "BITQUERY_URL", "BITQUERY_API_KEY"]
