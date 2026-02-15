Act as a Senior Backend Architect. Your task is to analyze the backend codebase (FastAPI) to generate a comprehensive, high-fidelity Mermaid.js (.mmd) diagram of the application's server-side structure.

Phase 1: Discovery & Extraction

Scan the backend directory, focusing on app/api, app/core, app/db, app/models, app/schemas, and app/services.
Identify the core architectural pillars: API Routers (Controllers), Business Logic Services, Data Models (ORM), Data Schemas (Pydantic), and Core Infrastructure (Auth, Config, Database).
Drill Down: For every pillar, extract granular implementation details:
API Interface: Specific routers (e.g., auth.router, transactions.router) and key endpoints within them.
Business Logic: Service classes or modules (e.g., UserService, PlaidService) and the specific operations they perform.
Data Layer: SQLAlchemy models (e.g., User, Transaction) representing database tables and their relationships.
Schemas: Key Pydantic models used for request/response validation (e.g., UserCreate, TransactionResponse).
Infrastructure: Core dependencies like database sessions, creating security tokens, and external integration clients.

Phase 2: Visualization

Construct a single .mmd file using flowchart TD syntax that visualizes the backend architecture.

Diagram Requirements:

Completeness: Do not use generic labels. Use the actual names of files, classes, and functions found during discovery (e.g., crud_user.py, models.Transaction).
Hierarchy: Use nested subgraph blocks to organize the backend stack:
API Layer (Routers & Endpoints)
Service Layer (Business Logic & External Integrations)
Data Layer (ORM Models & CRUD Utilities)
Schema Layer (Pydantic DTOs)
Connectivity: Draw directional arrows showing the flow of execution and data: Router -> Schema (Validation) -> Service -> CRUD/Model -> Database.
Syntax Compatibility: Use flowchart TD. Apply all visual styling (colors, shapes) via explicit class assignments at the bottom of the file (e.g., class RouterNode,ServiceNode className) to ensure compatibility with all Mermaid parsers.
Output: Provide ONLY the raw Mermaid.js code block representing the fully detailed backend architecture of Jualuma.
