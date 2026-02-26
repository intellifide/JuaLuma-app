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
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")
    db_pool_timeout_seconds: int = Field(default=30, alias="DB_POOL_TIMEOUT_SECONDS")
    db_pool_recycle_seconds: int = Field(default=1800, alias="DB_POOL_RECYCLE_SECONDS")
    db_pool_pre_ping: bool = Field(default=True, alias="DB_POOL_PRE_PING")

    plaid_client_id: str = Field(..., alias="PLAID_CLIENT_ID")
    plaid_secret: str = Field(..., alias="PLAID_SECRET")
    plaid_env: str = Field(default="sandbox", alias="PLAID_ENV")
    plaid_webhook_url: str | None = Field(default=None, alias="PLAID_WEBHOOK_URL")
    plaid_redirect_uri: str | None = Field(default=None, alias="PLAID_REDIRECT_URI")
    plaid_android_package_name: str | None = Field(
        default=None, alias="PLAID_ANDROID_PACKAGE_NAME"
    )
    plaid_webhook_secret: str | None = Field(default=None, alias="PLAID_WEBHOOK_SECRET")
    plaid_webhook_tolerance_seconds: int = Field(
        default=300, alias="PLAID_WEBHOOK_TOLERANCE_SECONDS"
    )
    plaid_sync_batch_size: int = Field(default=25, alias="PLAID_SYNC_BATCH_SIZE")
    plaid_safety_net_minutes: int = Field(default=180, alias="PLAID_SAFETY_NET_MINUTES")
    plaid_cleanup_inactive_days: int = Field(
        default=45, alias="PLAID_CLEANUP_INACTIVE_DAYS"
    )
    plaid_cleanup_grace_days: int = Field(default=7, alias="PLAID_CLEANUP_GRACE_DAYS")

    gcp_project_id: str = Field(
        default="", alias="GCP_PROJECT_ID"
    )
    google_cloud_project: str | None = Field(
        default=None, alias="GOOGLE_CLOUD_PROJECT"
    )
    gcp_api_key: str | None = Field(default=None, alias="VITE_GCP_API_KEY")
    firestore_healthcheck_enabled: bool = Field(
        default=False, alias="FIRESTORE_HEALTHCHECK_ENABLED"
    )

    stripe_secret_key: str | None = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str | None = Field(
        default=None, alias="STRIPE_WEBHOOK_SECRET"
    )
    stripe_publishable_key: str | None = Field(
        default=None, alias="STRIPE_PUBLISHABLE_KEY"
    )

    ai_model: str = Field(default="gemini-2.5-flash", alias="AI_MODEL")
    ai_model_prod: str = Field(default="gemini-2.5-flash", alias="AI_MODEL_PROD")
    ai_free_model: str = Field(default="gpt-oss-120b", alias="AI_FREE_MODEL")
    ai_paid_model: str = Field(default="gemini-2.5-flash", alias="AI_PAID_MODEL")
    ai_paid_fallback_model: str = Field(
        default="gpt-oss-120b", alias="AI_PAID_FALLBACK_MODEL"
    )
    ai_paid_fallback_enabled: bool = Field(
        default=True, alias="AI_PAID_FALLBACK_ENABLED"
    )
    ai_paid_fallback_message: str = Field(
        default=(
            "Premium AI limit reached for this period. "
            "Your request was processed with the standard model (gpt-oss-120b)."
        ),
        alias="AI_PAID_FALLBACK_MESSAGE",
    )
    ai_web_search_enabled: bool = Field(default=True, alias="AI_WEB_SEARCH_ENABLED")
    ai_web_search_max_results: int = Field(default=4, alias="AI_WEB_SEARCH_MAX_RESULTS")


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

    # Email — Gmail API (DWD service account, no SMTP)
    google_application_credentials: str | None = Field(
        default=None, alias="GOOGLE_APPLICATION_CREDENTIALS"
    )
    gmail_impersonate_user: str = Field(
        default="hello@jualuma.com", alias="GMAIL_IMPERSONATE_USER"
    )
    gmail_otp_impersonate_user: str = Field(
        default="noreply@jualuma.com", alias="GMAIL_OTP_IMPERSONATE_USER"
    )
    mail_from_name: str = Field(default="JuaLuma Support", alias="MAIL_FROM_NAME")
    mail_from_email: str = Field(default="support@jualuma.com", alias="MAIL_FROM_EMAIL")
    mail_reply_to: str = Field(default="support@jualuma.com", alias="MAIL_REPLY_TO")
    mail_contact_hello: str = Field(default="hello@jualuma.com", alias="MAIL_CONTACT_HELLO")
    support_email: str = Field(default="support@jualuma.com", alias="SUPPORT_EMAIL")
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
    # Active Web3 provider runtime contract (Tatum hard cutover).
    tatum_api_key: str | None = Field(default=None, alias="TATUM_API_KEY")
    tatum_base_url: str = Field(default="https://api.tatum.io", alias="TATUM_BASE_URL")
    tatum_timeout_seconds: int = Field(default=15, alias="TATUM_TIMEOUT_SECONDS")
    tatum_retry_max_attempts: int = Field(default=3, alias="TATUM_RETRY_MAX_ATTEMPTS")
    tatum_retry_base_backoff_ms: int = Field(
        default=250, alias="TATUM_RETRY_BASE_BACKOFF_MS"
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
    gcp_messaging_key: str | None = Field(default=None, alias="GCP_MESSAGING_KEY")

    @field_validator("database_url", "plaid_client_id", "plaid_secret", "frontend_url")
    @classmethod
    def _require_non_empty(cls, value: str, info):
        if not value or (isinstance(value, str) and not value.strip()):
            raise ValueError(f"{info.field_name} cannot be empty.")
        return value.strip()

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

    @field_validator(
        "db_pool_size",
        "db_max_overflow",
        "db_pool_timeout_seconds",
        "db_pool_recycle_seconds",
    )
    @classmethod
    def _require_non_negative_int(cls, value: int, info) -> int:
        if value < 0:
            raise ValueError(f"{info.field_name} must be >= 0.")
        return value

    @field_validator(
        "stripe_secret_key",
        "stripe_webhook_secret",
        "stripe_publishable_key",
        "plaid_webhook_url",
        "plaid_redirect_uri",
        "plaid_android_package_name",
        mode="before",
    )
    @classmethod
    def _strip_optional_stripe_values(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def _normalize_project_ids(self) -> "AppSettings":
        resolved = self.gcp_project_id or self.google_cloud_project
        if resolved:
            if not self.gcp_project_id:
                self.gcp_project_id = resolved
            if not self.google_cloud_project:
                self.google_cloud_project = resolved
        return self

    @property
    def is_local(self) -> bool:
        return self.app_env.lower() in {"local", "test"}

    @property
    def resolved_gcp_project_id(self) -> str | None:
        return self.gcp_project_id or self.google_cloud_project

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




settings = AppSettings()

__all__ = ["AppSettings", "settings"]
