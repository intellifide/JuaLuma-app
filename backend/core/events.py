"""
Core Event Bus implementation for Google Cloud Pub/Sub.
Handles connection, topic creation (for emulators), and message publishing.
"""

import json
import logging
from typing import Any

from google.cloud import pubsub_v1

from backend.core.config import settings

logger = logging.getLogger(__name__)

publisher: pubsub_v1.PublisherClient | None = None
# Log warning if no project ID is configured
if not settings.resolved_gcp_project_id:
    logger.warning(
        "No GCP_PROJECT_ID configured. Pub/Sub may fail."
    )

project_id: str = settings.resolved_gcp_project_id or "local-project"


def get_publisher() -> pubsub_v1.PublisherClient:
    global publisher
    if publisher is None:
        logger.info("Initializing Pub/Sub Publisher for Production Cloud")
        publisher = pubsub_v1.PublisherClient()
    return publisher


def initialize_events():
    """
    Called on app startup.
    In production (Cloud Run), topics should be pre-provisioned via tofu.
    """
    logger.info("Pub/Sub initialization complete (Production Mode).")


def publish_event(
    topic_id: str, data: dict[str, Any], attributes: dict[str, str] = None
) -> str:
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
