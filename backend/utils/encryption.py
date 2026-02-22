import base64
import logging

from backend.core import settings

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    HAS_CRYPTO = True
except ImportError:
    Fernet = None  # type: ignore
    HAS_CRYPTO = False

try:
    from google.cloud import kms_v1

    HAS_GCP_KMS = True
except ImportError:
    kms_v1 = None  # type: ignore
    HAS_GCP_KMS = False

logger = logging.getLogger(__name__)

_DEFAULT_MASTER_KEY = "CHANGE_ME_IN_PROD_OR_USE_KMS_PLEASE_12345"
_FERNET_PREFIX = "fernet:"
_GCPKMS_PREFIX = "gcpkms:"
_ALLOWED_PROVIDERS = {"local", "gcp_kms"}


def _resolve_provider() -> str:
    provider = (settings.encryption_provider or "").strip().lower()
    if not provider:
        provider = "gcp_kms" if settings.gcp_kms_key_name else "local"
    if provider not in _ALLOWED_PROVIDERS:
        raise ValueError(
            "ENCRYPTION_PROVIDER must be one of: local, gcp_kms."
        )
    return provider


def _get_master_key(app_env: str) -> str:
    master_key = settings.local_encryption_key
    if master_key:
        if master_key == _DEFAULT_MASTER_KEY and app_env not in {"local", "test"}:
            raise ValueError(
                "LOCAL_ENCRYPTION_KEY must be set to a non-default value in non-local environments."
            )
        return master_key

    if app_env in {"local", "test"}:
        logger.warning(
            "LOCAL_ENCRYPTION_KEY is not set; using the insecure default for local/test."
        )
        return _DEFAULT_MASTER_KEY

    raise ValueError(
        "LOCAL_ENCRYPTION_KEY must be configured for non-local environments."
    )


def _get_local_key(user_dek_ref: str) -> bytes:
    """
    Derives a localized encryption key from the service's master key and the user's reference.
    """
    master_key = _get_master_key(settings.app_env.lower())

    salt = b"jualuma_local_salt"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key_material = f"{master_key}:{user_dek_ref}".encode()
    return base64.urlsafe_b64encode(kdf.derive(key_material))


def _require_crypto() -> None:
    if not HAS_CRYPTO:
        raise ImportError("cryptography is required for local encryption.")


def _require_kms() -> None:
    if not HAS_GCP_KMS:
        raise ImportError(
            "google-cloud-kms is required when ENCRYPTION_PROVIDER=gcp_kms."
        )
    if not settings.gcp_kms_key_name:
        raise ValueError("GCP_KMS_KEY_NAME must be set for gcp_kms encryption.")


def _kms_client():
    _require_kms()
    return kms_v1.KeyManagementServiceClient()


def _encrypt_local(text: str, user_dek_ref: str) -> str:
    _require_crypto()
    key = _get_local_key(user_dek_ref)
    f = Fernet(key)
    return f.encrypt(text.encode("utf-8")).decode("utf-8")


def _decrypt_local(ciphertext: str, user_dek_ref: str) -> str:
    _require_crypto()
    key = _get_local_key(user_dek_ref)
    f = Fernet(key)
    return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")


def _encrypt_kms(text: str) -> str:
    client = _kms_client()
    response = client.encrypt(
        request={"name": settings.gcp_kms_key_name, "plaintext": text.encode("utf-8")}
    )
    return base64.b64encode(response.ciphertext).decode("ascii")


def _decrypt_kms(ciphertext: str) -> str:
    client = _kms_client()
    response = client.decrypt(
        request={
            "name": settings.gcp_kms_key_name,
            "ciphertext": base64.b64decode(ciphertext),
        }
    )
    return response.plaintext.decode("utf-8")


def encrypt_prompt(text: str, user_dek_ref: str) -> str:
    """
    Encrypts sensitive text (prompts or API secrets).

    Returns:
        A string-encoded ciphertext with a provider prefix.
    """
    provider = _resolve_provider()
    if provider == "gcp_kms":
        return f"{_GCPKMS_PREFIX}{_encrypt_kms(text)}"
    return f"{_FERNET_PREFIX}{_encrypt_local(text, user_dek_ref)}"


def decrypt_prompt(encrypted_text: bytes | str, user_dek_ref: str) -> str:
    """Decrypts sensitive text."""
    ciphertext = (
        encrypted_text.decode("utf-8")
        if isinstance(encrypted_text, bytes)
        else encrypted_text
    )

    try:
        if ciphertext.startswith(_FERNET_PREFIX):
            return _decrypt_local(ciphertext[len(_FERNET_PREFIX) :], user_dek_ref)
        if ciphertext.startswith(_GCPKMS_PREFIX):
            return _decrypt_kms(ciphertext[len(_GCPKMS_PREFIX) :])

        # Backward compatibility: try local, then KMS if configured.
        try:
            return _decrypt_local(ciphertext, user_dek_ref)
        except Exception:
            if settings.gcp_kms_key_name or _resolve_provider() == "gcp_kms":
                return _decrypt_kms(ciphertext)
            raise
    except Exception as exc:
        logger.error("Decryption failed: %s", exc)
        raise ValueError("Failed to decrypt content.") from exc


# Aliases for clarity in CEX integration context
encrypt_secret = encrypt_prompt
decrypt_secret = decrypt_prompt
