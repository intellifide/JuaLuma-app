Act as a Senior Systems Architect. Your task is to analyze the full context of the "Jualuma" application to generate a comprehensive, high-fidelity Mermaid.js (`.mmd`) diagram.

**Phase 1: Discovery & Extraction**

1.  **Scan** the available codebase, documentation, or project context for Jualuma.
2.  **Identify** every high-level architectural component: Frontend clients, API Gateways, Backend Microservices, Databases, and External Integrations.
3.  **Drill Down:** For every component identified, extract the granular details:
    - **Databases:** Specific table names, key column names, and relationships.
    - **APIs:** Specific REST/GraphQL endpoint paths (e.g., `/api/v1/resource`) and methods.
    - **Frontend:** Key logical components, widgets, and state management stores.
    - **Infrastructure:** Auth providers, message queues, and caching layers.

**Phase 2: Visualization**
Construct a single `.mmd` file using `graph TD` syntax that visualizes the extracted data.

**Diagram Requirements:**

- **Completeness:** Do not use generic labels like "Database" or "API." You must use the specific entity names found during your discovery (e.g., table `user_profiles` with column `subscription_tier`).
- **Hierarchy:** Use nested `subgraph` blocks to organize the stack (Client Layer, Gateway Layer, Service Layer, Data Layer, External Layer).
- **Connectivity:** Draw directional arrows showing the exact flow of data between these specific components.

**Output:**
Provide ONLY the raw Mermaid.js code block representing the fully detailed architecture of Jualuma.

place the created file in root directory.
