from firebase_admin import firestore
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore as gcf

from backend.core import settings
from backend.services.auth import _get_firebase_app


from typing import Any

# 2025-12-10 16:46 CST - use AnonymousCredentials with emulator to avoid ADC
def get_firestore_client() -> Any:
    """Get the Firestore client, initializing the app if necessary."""
    host = settings.resolved_firestore_host
    project_id = settings.firebase_project_id

    if host:
        _get_firebase_app()
        return gcf.Client(project=project_id, credentials=AnonymousCredentials()) # type: ignore

    _get_firebase_app()
    return firestore.client()
