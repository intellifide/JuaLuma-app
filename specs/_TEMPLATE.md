# [Task-ID]: [Feature Name]
**Status**: `Draft` | `Review` | `Approved` | `Implemented`
**Notion Task**: [Link]
**PR**: [Link]

---

## 1. Specification (The "What")
### User Story
As a **[Role]**, I want to **[Action]** so that **[Benefit]**.

### Context
*   **Current State**: [Describe what exists now]
*   **Desired State**: [Describe the new behavior]

### Business Rules
- [ ] **FinCEN Compliance**: Is this money transmission? (Must be Read-Only if yes)
- [ ] **Tax Logic**: Does Texas 80% basis apply?
- [ ] **Tier Gating**: Is this feature restricted to Pro/Ultimate?
- [ ] **Validation**: [List specific validation rules]

---

## 2. Technical Design (The "How")
### Architecture Changes
#### Database
*   **New Tables**:
    ```sql
    CREATE TABLE example (
        id UUID PRIMARY KEY,
        ...
    );
    ```
*   **Modifications**:
    *   Add column `x` to table `y`.
    *   Add index on `z`.

#### API
*   **New Endpoints**:
    *   `GET /api/v1/resource`
    *   `POST /api/v1/resource`
*   **Schemas**:
    *   Request Model: `ResourceCreate`
    *   Response Model: `ResourceResponse`

#### Events
*   **Publish**: `topic.name` (Payload: `{ id: ... }`)
*   **Consume**: `other.topic`

### Systems Impact Analysis
- [ ] **Stripe**: Does this affect billing/subscriptions?
- [ ] **Plaid**: Does this require new link tokens or item updates?
- [ ] **Firebase**: Does this require Firestore sync?
- [ ] **AI/Vertex**: Does this use the LLM Gateway?

---

## 3. Implementation Checklist (The "Steps")
1.  [ ] **DB**: Create Alembic migration.
2.  [ ] **Models**: Update SQLAlchemy models.
3.  [ ] **Schemas**: Create/Update Pydantic schemas.
4.  [ ] **API**: Implement route handlers.
5.  [ ] **Service**: Implement core logic.
6.  [ ] **Tests**: Write unit/integration tests.
7.  [ ] **UI**: Update frontend components (if applicable).

---

## 4. Verification Plan (The "Proof")
### Manual Validation
1.  [ ] automated-step: [Description]
2.  [ ] Log in as [Role].
3.  [ ] Navigate to [Page].
4.  [ ] Perform [Action].
5.  [ ] Verify [Result].

### Automated Tests
*   `pytest tests/api/test_feature.py`
*   `npm run test` (Frontend)

### Dev Tools Verification
*   Call `verify_integrations()` to ensure env is healthy.
*   Call custom MCP tools if applicable.
