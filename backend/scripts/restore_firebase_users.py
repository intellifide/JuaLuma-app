"""
Restore Identity Platform users from Postgres database to repair desync.
Updated to use Direct REST API (no Firebase Admin SDK).
"""

import json
import logging
import os
import sys

# Ensure backend module is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from google.cloud import firestore

from backend.models import User
from backend.services import auth
from backend.utils.database import SessionLocal
from backend.utils.firestore import get_firestore_client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("restore_identity_users")

def restore_firestore_profiles():
    """
    Sync Postgres users to Firestore 'users' collection.
    """
    logger.info("Starting Firestore profile sync...")
    db = SessionLocal()

    try:
        pg_users = db.query(User).all()
        fs_client = get_firestore_client()

        batch = fs_client.batch()
        batch_count = 0
        total_synced = 0

        for user in pg_users:
            doc_ref = fs_client.collection("users").document(user.uid)
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "role": user.role,
                "status": user.status,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "synced_at": firestore.SERVER_TIMESTAMP
            }
            batch.set(doc_ref, user_data, merge=True)
            batch_count += 1

            if batch_count >= 400:
                batch.commit()
                batch = fs_client.batch()
                logger.info(f"Committed batch of {batch_count} profiles...")
                total_synced += batch_count
                batch_count = 0

        if batch_count > 0:
            batch.commit()
            total_synced += batch_count

        logger.info(f"Successfully synced {total_synced} user profiles to Firestore.")

    except Exception as e:
        logger.error(f"Firestore sync failed: {e}")
    finally:
        db.close()

def restore_users():
    """
    Fetch all users from Postgres and ensure they exist in Identity Platform.
    """
    logger.info("Starting Identity Platform user restoration...")
    db = SessionLocal()

    try:
        pg_users = db.query(User).all()
        logger.info(f"Found {len(pg_users)} users in Postgres.")

        counts = {"restored": 0, "updated": 0, "skipped": 0, "failed": 0}

        for pg_user in pg_users:
            try:
                # 1. Attempt lookup by email
                identity_user = auth.get_user_by_email(pg_user.email)

                if identity_user:
                    uid = identity_user['localId']
                    if uid == pg_user.uid:
                        # Correct match
                        # Check claims
                        claims = {}
                        if "customAttributes" in identity_user:
                            try:
                                claims = json.loads(identity_user["customAttributes"])
                            except Exception:
                                pass

                        if claims.get("role") != pg_user.role:
                            logger.info(f"Updating claims for {pg_user.email}: {pg_user.role}")
                            auth.refresh_custom_claims(pg_user.uid, {"role": pg_user.role})
                            counts["updated"] += 1
                        else:
                            counts["skipped"] += 1
                        continue
                    else:
                        # Desync
                        logger.warning(f"Desync: Postgres UID={pg_user.uid}, Identity UID={uid}. Re-creating.")
                        auth.delete_user(uid)
                        identity_user = None # Force recreate

                # 2. Attempt lookup by UID if email failed or was deleted
                if not identity_user:
                    identity_user = auth.get_user(pg_user.uid)
                    if identity_user:
                        logger.info(f"UID {pg_user.uid} exists. Updating email.")
                        auth.update_identity_user(pg_user.uid, email=pg_user.email)
                        auth.refresh_custom_claims(pg_user.uid, {"role": pg_user.role})
                        counts["updated"] += 1
                        continue

                # 3. Create fresh
                logger.info(f"Restoring user {pg_user.email} with UID {pg_user.uid}")
                auth.create_identity_user(
                    email=pg_user.email,
                    password="password123",
                    uid=pg_user.uid,
                    email_verified=True
                )
                auth.refresh_custom_claims(pg_user.uid, {"role": pg_user.role})
                counts["restored"] += 1

            except Exception as e:
                logger.error(f"Failed to process user {pg_user.email}: {e}")
                counts["failed"] += 1

        logger.info(f"Restoration summary: {counts}")

    finally:
        db.close()

if __name__ == "__main__":
    restore_users()
    restore_firestore_profiles()
