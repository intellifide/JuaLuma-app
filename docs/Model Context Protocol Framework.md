# <a id="_ls5ks3ef3570"></a>Model Context Protocol Framework v2\.4


### __1\. Stripe \(Official Remote Server\)__

- __Why it’s Critical:__ Cursor can search *docs*, but it cannot see *your* data\. This server connects to your __Live Test Mode Dashboard__\.
- __Real\-Time Data Accessed:__
	- Verifies if your specific "Pro Plan" product has the correct __Texas Tax Code__ \(txcd\_10000\) metadata applied\.
	- Fetches the ID of the most recent failed webhook event to debug subscription logic instantly\.
	- Checks if a specific test customer actually has an active subscription during E2E test generation\.
- __Agent Owner:__ Stripe Tax Agent & Subscription Service Agent\.
- __Cursor Setup \(SSE\):__
	- __Type:__ SSE \(Server\-Sent Events\)
	- __URL:__ https://mcp\.stripe\.com/sse
	- __Env:__ No local env needed \(It triggers an OAuth flow in your browser to authorize Cursor\)\.

### __2\. Google Cloud Platform \(Community/Enesbol\)__

- __Why it’s Critical:__ While Cursor can run gcloud commands in the terminal, it relies on text output\. This MCP allows the Agent to query your infrastructure as __Structured JSON__, enabling complex reasoning\.
- __Real\-Time Data Accessed:__
	- __Cloud Run:__ "List all services with < 90% health" \(Agent gets a list and suggests fixes\)\.
	- __Cloud SQL Log Ledger:__ "Describe the schema of `audit.llm_logs`" \(Agent verifies the `encrypted_prompt`, `encrypted_response`, and `user_dek_ref` columns exist\)\.
	- __Builds:__ "Get the status of the latest Cloud Build ID" \(Agent waits for build success before proceeding\)\.
- __Agent Owner:__ GCP Integration Agent & CI/CD Pipeline Agent\.
- __Cursor Setup \(stdio\):__
	- __Command:__ uvx
	- __Args:__ gcp\-mcp\-server
	- __Env:__ GOOGLE\_APPLICATION\_CREDENTIALS=/path/to/your/key\.json \(Required for the Agent to auth as a Service Account\)\.

### __3\. Sentry \(Official/Community\)__

- __Why it’s Critical:__ This is the "Red Team" observability layer\. Cursor sees *local* errors; Sentry sees *production* errors\.
- __Real\-Time Data Accessed:__
	- Fetches the stack trace of the exact crash happening on the "Staging" environment right now\.
	- Correlates a new bug report with a specific code deployment commit hash\.
- __Agent Owner:__ Compliance Agent & Backend Logic Agent\.
- __Cursor Setup \(stdio\):__
	- __Command:__ uvx
	- __Args:__ mcp\-sentry
	- __Env:__ SENTRY\_AUTH\_TOKEN=your\_token

### __4\. Puppeteer \(Official\)__

- __Why it’s Critical:__ Cursor cannot "see" CSS transparency\. It reads code but cannot execute the physics\-based rendering engine required for your __Engineered Glass__ mandate\.
- __Real\-Time Data Accessed:__
	- __Computed Accessibility:__ Renders the React component, snapshots the DOM, and mathematically calculates the contrast ratio of Text Color vs\. Backdrop Blur \+ Background Image\.
	- __Visual Regression:__ Can tell if a Tailwind class change actually broke the "Glass" effect\.
- __Agent Owner:__ Material Glass Agent & Dynamic Contrast Auditor\.
- __Cursor Setup \(stdio\):__
	- __Command:__ npx
	- __Args:__ \-y @modelcontextprotocol/server\-puppeteer

### __Summary of cursor/mcp\.json Configuration__

JSON

\{  
  "mcpServers": \{  
    "stripe": \{  
      "url": "https://mcp\.stripe\.com/sse"  
    \},  
    "gcp": \{  
      "command": "uvx",  
      "args": \["gcp\-mcp\-server"\],  
      "env": \{  
        "GOOGLE\_APPLICATION\_CREDENTIALS": "/Users/yourname/keys/dev\-support\.json",  
        "GCP\_PROJECT\_ID": "finity\-app\-dev"  
      \}  
    \},  
    "sentry": \{  
      "command": "uvx",  
      "args": \["mcp\-sentry"\],  
      "env": \{  
        "SENTRY\_AUTH\_TOKEN": "sntrys\_\.\.\."  
      \}  
    \},  
    "puppeteer": \{  
      "command": "npx",  
      "args": \["\-y", "@modelcontextprotocol/server\-puppeteer"\]  
    \}  
  \}  
\}

---

## Related Documents

This Model Context Protocol Framework relates to the following planning documents:

**App Development Guides:**
- `Master App Dev Guide.md` - Master technical specification (MCP integration)
- `AI Agent Framework.md` - AI agent implementation (MCP server usage)
- `Local App Dev Guide.md` - Local development setup (local MCP server setup)

**Business Documents:**
- `Product-Roadmap.md` - Timeline for MCP implementation
- `Vendor-Relationships.md` - Vendor setup (Stripe, GCP MCP servers)

**Technical Documentation:**
- `Security-Architecture.md` - Security architecture (MCP security considerations)
- `Data-Flow-Diagrams.md` - Data flow architecture (MCP data flow)

**Last Updated:** December 07, 2025 at 08:39 PM
