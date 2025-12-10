
from firebase_admin import firestore
from backend.services.auth import _get_firebase_app

def get_firestore_client():
    """Get the Firestore client, initializing the app if necessary."""
    _get_firebase_app()
    return firestore.client()
