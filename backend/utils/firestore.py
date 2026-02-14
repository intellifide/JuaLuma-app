from typing import Any

from firebase_admin import firestore

from backend.services.auth import _get_firebase_app


# 2025-12-10 16:46 CST - use AnonymousCredentials with emulator to avoid ADC
def get_firestore_client() -> Any:
    """Get the Firestore client, initializing the app if necessary."""
    _get_firebase_app()
    return firestore.client()
