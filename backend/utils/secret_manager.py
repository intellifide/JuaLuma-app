import json
import logging
import re
import uuid
from pathlib import Path
from threading import Lock

from backend.core import settings
from backend.utils.encryption import decrypt_secret, encrypt_secret

try:
    from google.cloud import secretmanager

    HAS_GCP_SECRET_MANAGER = True
except ImportError:
    secretmanager = None  # type: ignore
    HAS_GCP_SECRET_MANAGER = False

logger = logging.getLogger(__name__)

_LOCAL_SECRET_PREFIX = "local:"
_FILE_SECRET_PREFIX = "file:"
_PROJECT_SECRET_PREFIX = "projects/"
_LOCAL_SECRETS: dict[str, str] = {}
_FILE_LOCK = Lock()


def _resolve_provider() -> str:
    provider = (settings.secret_provider or "").strip().lower()
    if provider:
        return provider
    if settings.app_env.lower() in {"local", "test"}:
        return "file"
    return "gcp"


def _sanitize(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9-]+", "-", value.strip())
    return cleaned.strip("-").lower() or "unknown"


def _build_secret_id(uid: str, purpose: str) -> str:
    suffix = uuid.uuid4().hex[:8]
    parts = [
        _sanitize(settings.service_name),
        _sanitize(purpose),
        _sanitize(uid[:12]),
        suffix,
    ]
    secret_id = "-".join(p for p in parts if p)
    return secret_id[:255]


def _require_gcp() -> None:
    if not HAS_GCP_SECRET_MANAGER:
        raise ImportError(
            "google-cloud-secret-manager is required for GCP secret storage."
        )
    if not settings.resolved_gcp_project_id:
        raise ValueError("GCP_PROJECT_ID must be set for GCP secret storage.")


def _resolve_store_path() -> Path:
    configured = settings.local_secret_store_path
    if configured:
        return Path(configured)
    return Path("data/local_secret_store.json")


def _read_store(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Local secret store is corrupted; starting fresh.")
        return {}


def _write_store(path: Path, payload: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def store_secret(value: str, *, uid: str, purpose: str) -> str:
    provider = _resolve_provider()
    if provider == "local":
        secret_id = uuid.uuid4().hex
        ref = f"{_LOCAL_SECRET_PREFIX}{secret_id}"
        _LOCAL_SECRETS[secret_id] = value
        return ref
    if provider == "file":
        secret_id = uuid.uuid4().hex
        ref = f"{_FILE_SECRET_PREFIX}{secret_id}"
        encrypted = encrypt_secret(value, uid)
        store_path = _resolve_store_path()
        with _FILE_LOCK:
            store = _read_store(store_path)
            store[secret_id] = encrypted
            _write_store(store_path, store)
        return ref
    if provider != "gcp":
        raise ValueError("SECRET_PROVIDER must be one of: local, file, gcp.")

    _require_gcp()
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{settings.resolved_gcp_project_id}"
    secret_id = _build_secret_id(uid, purpose)
    secret = client.create_secret(
        request={
            "parent": parent,
            "secret_id": secret_id,
            "secret": {"replication": {"automatic": {}}},
        }
    )
    client.add_secret_version(
        request={"parent": secret.name, "payload": {"data": value.encode("utf-8")}}
    )
    return f"{secret.name}/versions/latest"


def get_secret(ref: str, *, uid: str | None = None) -> str:
    provider = _resolve_provider()
    if ref.startswith(_LOCAL_SECRET_PREFIX):
        secret_id = ref[len(_LOCAL_SECRET_PREFIX) :]
        if secret_id not in _LOCAL_SECRETS:
            raise KeyError("Secret reference not found in local store.")
        return _LOCAL_SECRETS[secret_id]

    if ref.startswith(_FILE_SECRET_PREFIX):
        secret_id = ref[len(_FILE_SECRET_PREFIX) :]
        store_path = _resolve_store_path()
        with _FILE_LOCK:
            store = _read_store(store_path)
            if secret_id not in store:
                raise KeyError("Secret reference not found in local file store.")
            if uid is None:
                raise ValueError("uid is required to decrypt local file secrets.")
            return decrypt_secret(store[secret_id], uid)

    if ref.startswith(_PROJECT_SECRET_PREFIX):
        _require_gcp()
        client = secretmanager.SecretManagerServiceClient()
        name = ref if "/versions/" in ref else f"{ref}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("utf-8")

    if settings.app_env.lower() in {"local", "test"}:
        logger.warning("Secret reference looks like plaintext; using as-is for local/test.")
        return ref

    raise ValueError("Secret reference is not a valid Secret Manager resource name.")


def delete_secret(ref: str, *, uid: str | None = None) -> None:
    provider = _resolve_provider()
    if ref.startswith(_LOCAL_SECRET_PREFIX):
        secret_id = ref[len(_LOCAL_SECRET_PREFIX) :]
        _LOCAL_SECRETS.pop(secret_id, None)
        return

    if ref.startswith(_FILE_SECRET_PREFIX):
        secret_id = ref[len(_FILE_SECRET_PREFIX) :]
        store_path = _resolve_store_path()
        with _FILE_LOCK:
            store = _read_store(store_path)
            store.pop(secret_id, None)
            _write_store(store_path, store)
        return

    if provider == "gcp" and ref.startswith(_PROJECT_SECRET_PREFIX):
        _require_gcp()
        client = secretmanager.SecretManagerServiceClient()
        name = ref.split("/versions/")[0]
        client.delete_secret(request={"name": name})
