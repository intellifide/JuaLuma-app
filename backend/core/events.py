"""
Core Event Bus implementation for Google Cloud Pub/Sub.
Handles connection, topic creation (for emulators), and message publishing.
"""
import json
import logging
import os
from typing import Any, Optional

from google.cloud import pubsub_v1
from google.api_core.exceptions import AlreadyExists
from backend.core.config import settings

logger = logging.getLogger(__name__)

publisher: Optional[pubsub_v1.PublisherClient] = None
# Log warning if no project ID is configured
if not settings.gcp_project_id and not settings.firebase_project_id:
    logger.warning("No GCP_PROJECT_ID or FIREBASE_PROJECT_ID configured. Pub/Sub may fail.")

project_id: str = settings.gcp_project_id or settings.firebase_project_id or "local-project"


def get_publisher() -> pubsub_v1.PublisherClient:
    global publisher
    if publisher is None:
        # If running locally with emulator, the lib automatically detects PUBSUB_EMULATOR_HOST
        # provided it is set in env vars. We ensure it's logged.
        if settings.pubsub_emulator_host:
             logger.info(f"Initializing Pub/Sub Publisher with Emulator at {settings.pubsub_emulator_host}")
        else:
             logger.info("Initializing Pub/Sub Publisher for Production Cloud")
        
        publisher = pubsub_v1.PublisherClient()
    return publisher


def initialize_events():
    """
    Called on app startup.
    If using the emulator, we MUST ensure topics/subs exist because it starts empty.
    """
    # Only run setup if emulator is explicitly configured
    if not settings.pubsub_emulator_host:
        return

    logger.info("Pub/Sub Emulator detected. Auto-creating topics...")
    
    # Ensure env var is set for the client lib to pick it up, although AppSettings usually reads from env
    # If settings read it, it likely came from env, but let's be safe if it was defaulted.
    if "PUBSUB_EMULATOR_HOST" not in os.environ and settings.pubsub_emulator_host:
        os.environ["PUBSUB_EMULATOR_HOST"] = settings.pubsub_emulator_host

    client = get_publisher()
    subscriber = pubsub_v1.SubscriberClient()
    
    # List of required topics
    required_topics = ["ticket_events", "access-requests", "access-refresh-requests"]
    
    for topic_id in required_topics:
        topic_path = client.topic_path(project_id, topic_id)
        try:
            client.create_topic(request={"name": topic_path})
            logger.info(f"Created topic: {topic_path}")
        except AlreadyExists:
            logger.info(f"Topic already exists: {topic_path}")
        except Exception as e:
            logger.error(f"Failed to create topic {topic_path}: {e}")

        # Also create a default subscription for debugging
        sub_id = f"{topic_id}-debug-sub"
        sub_path = subscriber.subscription_path(project_id, sub_id)
        
        try:
            subscriber.create_subscription(
                request={"name": sub_path, "topic": topic_path}
            )
            logger.info(f"Created debug subscription: {sub_path}")
        except AlreadyExists:
            pass
        except Exception as e:
            logger.error(f"Failed to create sub {sub_path}: {e}")
            
    logger.info("Pub/Sub initialization complete.")


def publish_event(topic_id: str, data: dict[str, Any], attributes: dict[str, str] = None) -> str:
    """
    Publish a JSON event to the specified topic.
    """
    client = get_publisher()
    topic_path = client.topic_path(project_id, topic_id)
    
    payload_bytes = json.dumps(data, default=str).encode("utf-8")
    
    future = client.publish(topic_path, payload_bytes, **(attributes or {}))
    message_id = future.result()
    
    logger.info(f"Published event to {topic_id}: {message_id}")
    return message_id
