# [TASK-002]: Notification System
**Status**: `Draft`
**Phase**: 2

---

## 1. Specification
### User Story
As a **User**, I want to **be notified of important events** (Support updates, Security alerts) so that **I can take timely action**.

### Privacy & Compliance (GLBA)
*   **Constraint**: Emails are considered "insecure transit" for the purpose of this architecture unless PGP is used (which we do not assume).
*   **Requirement**: NO Non-Public Personal Information (NPPI) in email bodies.
    *   **Prohibited**: "Your transfer of $500 failed.", "Ticket #1234 regarding transaction X".
    *   **Allowed**: "You have a new secure message.", "Account Security Alert."

---

## 2. Technical Design
### Architecture
*   **Hybrid Delivery**:
    1.  **In-App**: Stored in Postgres `local_notifications` table. Contains full context (secure context).
    2.  **Email**: Sent via SMTP/Provider. Contains **generic pointer** only.

### Database Schema
Reusing existing `LocalNotification` model in `backend/models/notification.py`.
*   `id`: UUID
*   `uid`: User Link
*   `title`: Encrypted or Opaque? -> Plain text is fine for internal database if encrypted at rest, but let's keep it generic.
*   `message`: The full secure message.
*   `is_read`: Boolean.
*   `created_at`: Timestamp.

### API
*   `GET /api/notifications`: Returns list of `LocalNotification`.
*   `POST /api/notifications/{id}/read`: Ack.

### Services
*   `backend/services/email.py`:
    *   function `send_generic_alert(to_email: str, title: str)`
    *   Uses `smtplib` pointing to a configured SMTP Relay (or Mock for Dev).
*   `backend/services/notifications.py`:
    *   function `create_notification(uid, title, message, send_email=True)`
    *   Writes to DB.
    *   If `send_email` and user prefs allow -> calls `email.send_generic_alert`.

### Integration Points
*   **Support Portal**: When Agent replies -> Trigger `create_notification`.
*   **System**: When Payout processed -> Trigger `create_notification`.

---

## 3. Implementation Checklist
1.  [ ] **Service**: Implement `email.py` (Mock/SMTP).
2.  [ ] **Service**: Implement `NotificationService` logic.
3.  [ ] **API**: Create endpoints.
4.  [ ] **Frontend**: Implement `NotificationDrawer`.
5.  [ ] **Tooling**: Ensure Testmail MCP is ready for verification.
