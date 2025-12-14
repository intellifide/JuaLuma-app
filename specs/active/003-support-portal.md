# Specification: Support Operations (Agent Portal)

## 1. Overview
The Support Portal is a restricted interface for Customer Support Agents and Managers to view, manage, and resolve user tickets. It requires strict audit logging for GLBA/privacy compliance.

## 2. Security & Compliance
- **Role-Based Access Control (RBAC):**
    - `support_agent`: Can View Tickets, Reply, Resolve.
    - `support_manager`: Can also view Agent Performance Stats (out of scope for MVP but noted).
- **Audit Logging:**
    - EVERY read action (viewing a ticket/user) must be logged to `audit.support_portal_actions`.
    - EVERY write action (reply/resolve) must be logged.
- **Data Minimization:**
    - Agents see only necessary info. No full PII (SSN/DOB) unless explicitly unlocked (not needed for MVP).

## 3. Data Models
- **Database:** Existing `support_tickets` and `support_messages` tables.
- **Audit:** Existing `audit.support_portal_actions` table.
   - `action_type`: 'VIEW_TICKET', 'REPLY_TICKET', 'RESOLVE_TICKET'.

## 4. API Endpoints (New Router: `/api/support-portal`)
All endpoints require `current_user.role` in [`support_agent`, `support_manager`].

### 4.1 Tickets
- `GET /api/support-portal/tickets`: List all tickets (status filter).
    - *Audit:* None (list view is low risk, but specific ticket view is high risk).
- `GET /api/support-portal/tickets/{id}`: Get full ticket details + user overview.
    - *Audit:* `VIEW_TICKET`
- `POST /api/support-portal/tickets/{id}/reply`: Agent reply.
    - *Audit:* `REPLY_TICKET`
    - *Notifications:* Triggers user email.
- `POST /api/support-portal/tickets/{id}/status`: Change status (Resolve/Close).
    - *Audit:* `RESOLVE_TICKET`

## 5. Frontend Implementation (`SupportPortal.tsx`)
- **Authentication:** Dedicated login overlap or role check on main login.
- **Layout:**
    - Ticket Queue (Open, Pending, Resolved).
    - Ticket Detail View (Thread + Quick Actions).
- **API Integration:** Replace mock data with real generic calls.

## 6. Verification
- **Dev Tool:** `seed_support_tickets()` to generate traffic.
- **Manual:** Login as Agent -> View Ticket -> Check Audit Log.
