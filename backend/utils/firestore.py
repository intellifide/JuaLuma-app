from google.cloud import firestore

from backend.core import settings

_firestore_client = None

def get_firestore_client() -> firestore.Client:
    """Get the Firestore client using google-cloud-firestore."""
    global _firestore_client
    if _firestore_client:
        return _firestore_client

    project_id = settings.resolved_gcp_project_id
    # google-cloud-firestore automatically detects emulator via FIRESTORE_EMULATOR_HOST
    _firestore_client = firestore.Client(project=project_id)
    return _firestore_client
