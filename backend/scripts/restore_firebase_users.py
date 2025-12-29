"""
Restore Firebase Auth users from Postgres database to repair desync/emulator reset.

This script ensures that every user in the local PostgreSQL database has a corresponding
authenticated record in the Firebase Auth Emulator, using the same UID to maintain integrity.
"""

# Created: 2025-12-29 12:50 CST by Antigravity

import os
import sys
import logging
from typing import List

# Ensure backend module is in path
# Current file: /Users/midnight/app-projects/jualuma-app/backend/scripts/restore_firebase_users.py
# Root is two levels up
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    import firebase_admin
    from firebase_admin import auth, firestore
    from google.cloud import firestore as gcf
    from google.auth.credentials import AnonymousCredentials
    from sqlalchemy.orm import Session
    from backend.models import User
    from backend.utils.database import SessionLocal
    from backend.core import settings
except ImportError as e:
    print(f"Error importing dependencies: {e}")
    print("Ensure you are running this from the backend virtual environment.")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("restore_firebase_users")

def _initialize_firebase():
    """Initialize Firebase Admin SDK using the emulator settings from config."""
    if settings.is_local:
        if settings.resolved_auth_emulator_host:
            os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.resolved_auth_emulator_host
            logger.info(f"Using Auth Emulator at: {settings.resolved_auth_emulator_host}")
        
        if settings.resolved_firestore_host:
            os.environ["FIRESTORE_EMULATOR_HOST"] = settings.resolved_firestore_host
            logger.info(f"Using Firestore Emulator at: {settings.resolved_firestore_host}")
        
        os.environ["FIREBASE_PROJECT_ID"] = settings.firebase_project_id
        logger.info(f"Firebase Project ID: {settings.firebase_project_id}")
        
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})
    logger.info("Firebase Admin SDK initialized.")

def restore_firestore_profiles():
    """
    Sync Postgres users to Firestore 'users' collection to ensure security rules work.
    """
    logger.info("Starting Firestore profile sync...")
    db: Session = SessionLocal()
    
    # Ensure Firestore Emulator is targeted if local
    if settings.is_local and settings.resolved_firestore_host:
        os.environ["FIRESTORE_EMULATOR_HOST"] = settings.resolved_firestore_host

    try:
        pg_users: List[User] = db.query(User).all()
        
        # Explicitly use AnonymousCredentials for emulator to avoid ADC errors
        if settings.is_local:
             fs_client = gcf.Client(
                 project=settings.firebase_project_id,
                 credentials=AnonymousCredentials()
             )
        else:
             fs_client = firestore.client()
        
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
            
            # Commit batches of 400 (limit is 500)
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
    Fetch all users from Postgres and ensure they exist in correctly in Firebase Auth.
    If a user is missing in Firebase, it is created with the Postgres UID and a default password.
    """
    _initialize_firebase()
    db: Session = SessionLocal()
    
    try:
        pg_users: List[User] = db.query(User).all()
        logger.info(f"Found {len(pg_users)} users in Postgres.")
        
        counts = {
            "restored": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0
        }
        
        for pg_user in pg_users:
            try:
                # 1. Attempt lookup by email
                fb_user = None
                try:
                    fb_user = auth.get_user_by_email(pg_user.email)
                except auth.UserNotFoundError:
                    pass
                
                if fb_user:
                    if fb_user.uid == pg_user.uid:
                        # Correct match
                        # Ensure custom claims are up to date
                        current_claims = fb_user.custom_claims or {}
                        if current_claims.get("role") != pg_user.role:
                            logger.info(f"Updating claims for {pg_user.email}: {pg_user.role}")
                            auth.set_custom_user_claims(pg_user.uid, {"role": pg_user.role})
                            counts["updated"] += 1
                        else:
                            counts["skipped"] += 1
                        continue
                    else:
                        # Desync: Email exists but UID is different
                        logger.warning(
                            f"Desync detected for {pg_user.email}: "
                            f"Postgres UID={pg_user.uid}, Firebase UID={fb_user.uid}. "
                            "Re-linking to Postgres UID..."
                        )
                        # Delete the "wrong" Firebase user
                        auth.delete_user(fb_user.uid)
                
                # 2. Attempt lookup by UID
                try:
                    auth.get_user(pg_user.uid)
                    logger.info(f"UID {pg_user.uid} exists. Updating email and claims.")
                    auth.update_user(pg_user.uid, email=pg_user.email)
                    auth.set_custom_user_claims(pg_user.uid, {"role": pg_user.role})
                    counts["updated"] += 1
                except auth.UserNotFoundError:
                    # 3. Create fresh record with correct UID
                    logger.info(f"Restoring user {pg_user.email} with UID {pg_user.uid}")
                    auth.create_user(
                        uid=pg_user.uid,
                        email=pg_user.email,
                        password="password123", # Standard local test password
                        email_verified=True
                    )
                    auth.set_custom_user_claims(pg_user.uid, {"role": pg_user.role})
                    counts["restored"] += 1
                    
            except Exception as e:
                logger.error(f"Failed to process user {pg_user.email}: {e}")
                counts["failed"] += 1
                
        logger.info(
            f"Restoration summary: "
            f"Restored={counts['restored']}, "
            f"Updated={counts['updated']}, "
            f"Skipped={counts['skipped']}, "
            f"Failed={counts['failed']}"
        )
        
    finally:
        db.close()

if __name__ == "__main__":
    restore_users()
    restore_firestore_profiles()
