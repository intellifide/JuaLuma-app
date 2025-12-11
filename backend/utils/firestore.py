import os

from firebase_admin import firestore
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore as gcf

from backend.services.auth import _get_firebase_app


# 2025-12-10 16:46 CST - use AnonymousCredentials with emulator to avoid ADC
def get_firestore_client():
    """Get the Firestore client, initializing the app if necessary."""
    host = os.getenv("FIRESTORE_EMULATOR_HOST")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "finity-local")

    if host:
        _get_firebase_app()
        return gcf.Client(project=project_id, credentials=AnonymousCredentials())

    _get_firebase_app()
    return firestore.client()
