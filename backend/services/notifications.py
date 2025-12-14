from sqlalchemy.orm import Session
from backend.models.notification import LocalNotification
from backend.services.email import get_email_client
from backend.models.user import User # Assuming User model has preferences
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.email_client = get_email_client()

    def create_notification(self, user: User, title: str, message: str, send_email: bool = True) -> LocalNotification:
        """
        Creates a LocalNotification (secure) and optionally triggers a generic Email alert.
        """
        # 1. Write to DB (Secure Context) - Contains full message
        notification = LocalNotification(
            uid=user.uid,
            title=title,
            message=message,
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        # 2. Send Email (Insecure Context) - Generic Pointer only
        if send_email:
            try:
                # In a real app, check user.notification_preferences here
                self.email_client.send_generic_alert(user.email, title)
            except Exception as e:
                logger.error(f"Failed to dispatch email for notification {notification.id}: {e}")

        return notification

    def mark_as_read(self, notification_id: str, uid: str) -> None:
        notification = self.db.query(LocalNotification).filter(
            LocalNotification.id == notification_id,
            LocalNotification.uid == uid
        ).first()
        if notification:
            notification.is_read = True
            self.db.add(notification)
            self.db.commit()
