---
trigger: always_on
---

# jualuma App Core Development Rules

- all files must be prepended with its core purpose
- every codeblock needs to have a comment on the purpose of its function.
- every file update requires a date and time stamp at the top of the file to identify the last time the file was modified.
- restart docker services whenever backend changes are made. restart docker services for any required frontend updates as well.
- always create an account using testmail.app for testing purposes. never create arbitrary email accounts.

# 1. Production Quality First

- **Zero Frontend Business Logic:** The frontend is for display and interaction only. ALL business logic, calculations, and data processing must reside in the Backend (FastAPI).
- **Security & Secrets:**
  - NEVER handle secrets, API keys, or sensitive credentials in the frontend.
  - Secrets must only exist in gitignored `.env` files (local) or secure secret managers (production).
  - Never commit `.env` files or hardcoded secrets to version control.
- **Robust Error Handling:** Do not assume "happy paths". Implement comprehensive error handling and logging in the backend.
- **Type Safety:** Enforce strict typing in the backend (mypy).

# 2. Documentation & Source of Truth

- **Master Guide:** ALWAYS reference [docs/Master App Dev Guide.md](cci:7://file:///Users/midnight/Projects/jualuma-app/docs/Master%20App%20Dev%20Guide.md:0:0-0:0) for role taxonomy, compliance, and specific business rules.
- **Codebase as Context:** Do not rely on rules files for specific paths or filenames involving minor implementation details; search the codebase to understand the current structure.

# 3. Development Workflow

- **Git Safety:**
  - NEVER update git without a direct, explicit command from the user.
  - Use `GitKraken` MCP tools for all git operations.
- **Agent Capabilities:** Use available MCP tools (GitKraken, Stripe, etc.) for operations rather than suggesting manual CLI commands.
- **Communication:** Explain technical decisions in plain language. Assume the user is a junior developer learning the codebase.

# 4. Scope & Boundaries

- **Workspace:** Restrict all file operations to the `/jualuma-app` workspace.
- **No "Simplification" Shortcuts:** Do not skip steps or "assume" external handling (e.g., email dispatch) unless explicitly mocked for a defined test scope.
