# jualuma Website Template

This directory contains a complete multi-page HTML prototype of the jualuma platform. This is a static website template that demonstrates the full application interface with realistic fake data.

## Structure

```
website_template/
├── css/
│   └── styles.css          # Main stylesheet with Engineered Liquid Glass theme
├── js/
│   └── main.js             # JavaScript for interactivity (theme toggle, modals, tabs, etc.)
├── legal/
│   ├── terms.html          # Terms of Service
│   ├── privacy.html        # Privacy Policy
│   └── ai-disclaimer.html  # AI Assistant Disclaimer
├── index.html              # Home/Landing page
├── features.html            # Features overview
├── pricing.html            # Pricing plans (Free, Essential, Pro, Ultimate)
├── about.html              # About page with mission
├── marketplace.html        # Marketplace preview (customer-facing)
├── developer-marketplace.html  # Developer Marketplace (developer-facing)
├── developer-sdk.html      # Developer SDK & Sandbox mock
├── signup.html             # Sign up page
├── login.html              # Login page
├── reset-password.html     # Password reset page
├── dashboard.html           # Main dashboard with fake financial data
├── ai-assistant.html        # AI Assistant preview with chat interface
├── settings.html            # Account settings (profile, subscription, notifications, privacy, security)
├── support.html             # Support and contact page (user-facing)
├── support-portal.html      # Customer Support Portal mock (separate service, read-only)
├── feature-request.html     # Feature request intake form
├── connect-accounts.html    # Account linking/management (bank, Web3, CEX)
├── categories.html          # Category review queue and bulk fixes
├── maintenance.html         # Maintenance notice page
├── 404.html                 # Not found page
└── README.md                # This file
```

## Features

### Design & Branding
- **Engineered Liquid Glass** theme with backdrop-filter blur effects
- Royal Purple, Deep Indigo, and Aqua color palette
- Dark mode toggle (persisted via localStorage)
- WCAG 2.1 AA contrast compliance
- Fully responsive design

### Pages Included

1. **Landing Pages**
   - Home page with hero section and feature overview
   - Features page with detailed feature descriptions
   - Pricing page with all tier comparisons
   - About page with mission and company information
   - Marketplace preview page (customer-facing)
   - Developer Marketplace page (developer-facing with submission workflow)
   - Developer SDK page (mock SDK tools, playground, test harness)

2. **Authentication Pages**
   - Sign up page with form validation
   - Login page
   - Password reset page
   - All forms include faux submission states

3. **Dashboard**
   - Complete financial dashboard with realistic fake data
   - Account overview (Checking, Investment, Web3, CEX)
   - Recent transactions table
   - Budget overview with progress bars
   - Recurring subscriptions list
   - Investment holdings table
   - Tab-based navigation for different account types
   - Infographics: net worth trend line, cash flow bars, spending donut chart
   - Links to connect/manage accounts and fix categories
   - Auto-syncing charts that update based on selected view period (1W, 1M, 3M, 6M, 1Y, YTD)
   - Custom date range selection (start and end dates) for charts and tables

4. **AI Assistant**
   - Clean chat interface accessible to all tiers
   - Privacy/user agreement modal shown on page load for subscribed users (access granted after acceptance)
   - Sample conversation threads
   - Typing indicators
   - Message bubbles with timestamps
   - Full disclaimer display (AI chat retention notices removed)

5. **Settings**
   - Profile management
   - Subscription management with billing history
   - Notification preferences
   - Privacy controls
   - Security settings (password change, 2FA, active sessions)

6. **Support**
   - Contact form
   - FAQ section
   - Contact information
   - Community links
   - Feature request intake

7. **Legal Pages**
   - Terms of Service (complete text from `docs/legal/Terms-of-Service.md`)
   - Privacy Policy (complete text from `docs/legal/Privacy-Policy.md`)
   - AI Assistant Disclaimer (complete text from `docs/legal/AI-Assistant-Disclaimer.md`)
   - All TBDs replaced with explicit contact information

8. **Account & Categorization**
    - Account linking/management page (bank/Plaid sandbox, Web3, CEX) with read-only reminders
    - Category review queue for low-confidence transactions, bulk fixes, and recent edits

9. **Customer Support Portal** (Mock)
    - Separate support portal page demonstrating ticket management interface
    - Ticket list with filters and search (disabled in mock)
    - Ticket detail pane with customer info (masked PII), conversation history, internal notes
    - Canned responses, reassignment, and escalation controls (all disabled)
    - Mock banner indicating no data changes occur
    - Designed for non-technical customer service representatives

9. **PWA Readiness**
    - `manifest.json`, theme-color, icons, and service worker registration
    - Basic offline cache for shell assets

### Interactive Features

- **Theme Toggle**: Dark/light mode with localStorage persistence
- **Mobile Navigation**: Hamburger menu for mobile devices
- **Tab System**: Tab switching for dashboard accounts and settings sections
- **Modal System**: Delete account modal with focus trap
- **Form Handling**: Faux form submissions with success toasts
- **AI Chat**: Interactive chat interface with sample responses
- **Active Navigation**: Automatic highlighting of current page

### Accessibility

- Skip links for keyboard navigation
- ARIA labels on all interactive elements
- Focus indicators on all focusable elements
- Modal focus trap
- Screen reader support
- High contrast mode support
- Reduced motion support

### Data Simulation

The dashboard includes realistic fake data:
- **Checking Accounts**: Chase Checking ($8,450.32), Wells Fargo Savings ($12,300.00)
- **Investment Accounts**: Fidelity 401(k) ($145,230.50), Charles Schwab IRA ($68,420.75)
- **Web3 Wallets**: MetaMask ($4,250.80) with ETH, BTC, USDC holdings
- **CEX Accounts**: Coinbase Pro ($8,238.45) with crypto holdings
- **Transactions**: Recent transaction history with categories
- **Budgets**: Budget tracking with progress indicators
- **Subscriptions**: Recurring subscription list
- **Investments**: Stock and crypto holdings with performance data

## Usage

### Local Development Server

**IMPORTANT:** This is a multi-page static site, NOT a single-page application. Run the server without the `-s` (SPA) flag:

```bash
npx --yes serve website_template -l 4173
```

**Do NOT use:** `npx serve -s` (the `-s` flag causes navigation failures)

All navigation links use relative paths (e.g., `href="features.html"`). The server serves HTML files directly without URL rewriting.

**Viewing the Support Portal Mock:**
- Navigate to `http://localhost:4173/support-portal.html` to view the mock customer support portal
- All controls are disabled in the mock implementation (buttons, inputs, selects)
- A banner at the top indicates this is a mock with no data changes
- The portal demonstrates the UI layout and workflow for customer service representatives

### Direct File Access

Simply open any HTML file in a web browser. All pages are self-contained and link to each other. The JavaScript and CSS files are referenced with relative paths.

## Implementation Decisions

### HTML/JS Architecture (No React Build)

This template uses vanilla HTML, CSS, and JavaScript to demonstrate the full application interface. All features are implemented as static HTML with JavaScript modules:

- **Feature Previews/Paywalls**: Premium sections are wrapped with `data-feature-preview` attributes. JavaScript adds overlay, badge, and interaction blocking. Clicking blocked elements opens an upgrade modal linking to `pricing.html`.
- **Customer Support Portal**: Customer support functionality is provided via a separate frontend/service with its own authentication. The user-facing application does not contain any admin links or references; users access support through the standard support page.
- **No Backend Logic**: All features are UI-only with hardcoded mock data. No API calls or state management.

### PWA Service Worker

- **Registration**: Service worker (`sw.js`) is registered on page load via `navigator.serviceWorker.register('/sw.js')`.
- **Cache Strategy**: Network-first for HTML pages, cache-first for static assets (CSS, JS, images).
- **Scope**: Basic shell assets cached for offline viewing. Does NOT unregister existing workers or clear caches on load.
- **Manifest**: `manifest.json` defines PWA metadata, theme color, and icons.

### Tier Limits & Features

Tier specifications match `Master App Dev Guide.md`:

- **Free Tier**: 20 AI queries/day (Vertex AI Gemini 2.5 Flash); 45-day transaction data retention (no archive); AI chat history has no retention limits; up to 2 traditional accounts, 1 investment account, 1 Web3 wallet, 1 CEX account; manual sync throttled to 10 uses/day; Developer Marketplace preview only (interactions blocked).
- **Essential Tier ($12/month)**: 30 AI queries/day (Vertex AI Gemini 2.5 Flash with encrypted RAG prompts); 24-hour automated refresh; 30-day hot transaction data + Coldline archive; AI chat history has no retention limits; up to 3 traditional accounts, 2 investment accounts, 1 Web3 wallet, 3 CEX accounts; manual sync disabled; Developer Marketplace preview only (interactions blocked).
- **Pro Tier ($25/month or $20.83/month annual - $250/year)**: 40 AI queries/day (Vertex AI Gemini 2.5 Flash with encrypted RAG prompts); 14-day free trial; Texas sales tax applies to 80% of subscription fee (20% exemption for data processing); full transaction history; AI chat history has no retention limits; up to 5 traditional accounts, 5 investment accounts (via Plaid Investments API), 5 Web3 wallets, 10 CEX accounts; Developer Marketplace access (full access to publish widgets).
- **Ultimate Tier ($60/month or $600/year)**: 80 AI queries/day (Vertex AI Gemini 2.5 Pro with routing); 14-day free trial; up to 20 account connections (Traditional, Investment, Web3 wallets, CEX); family/couple features (individual net worth tracking, account assignment per family member, tab-based interface, combined family dashboard); Developer Marketplace access (full access to publish widgets).

### Compliance & Legal Messaging

- **Read-Only Access**: Emphasized on landing page and account connection pages. All integrations are strictly read-only; platform never executes transfers or withdrawals.
- **Data Retention**: Transaction data retention displayed per tier on account connection pages. AI chat history has no retention limits for all tiers.
- **AI Disclaimer**: Full disclaimer on AI assistant page with link to `legal/ai-disclaimer.html`.
- **Texas Tax**: Pro/Ultimate tiers show 80% taxable basis note in pricing and billing sections.

## Notes

- All contact information uses explicit fictional corporate details (no TBDs)
- All legal text matches the source documents from `docs/legal/`
- Marketing language follows approved guidelines from `Marketing-Content-Guidelines.md`
- Tier details match specifications from `Master App Dev Guide.md`
- Social media links are placeholder URLs
- Forms use faux submission (no actual backend)
- This is a static HTML prototype for UI/UX visualization only; no backend functionality is implemented

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Progressive enhancement (works without JavaScript, enhanced with it)

## Developer Marketplace & SDK

The template includes two developer-facing pages:

- **Developer Marketplace** (`developer-marketplace.html`): Developer-facing page explaining the marketplace submission workflow, immutable payout ledger, ratings integrity, data access model, preview/paywall behavior, observability metrics, and policies/removals. Includes access control notes: Pro & Ultimate tiers get full marketplace access; Free & Essential tiers see preview-only with blocked interactions.

- **Developer SDK** (`developer-sdk.html`): Mock SDK page with tabbed interface including:
  - **Playground**: Widget manifest editor with validation (name, version, scopes, preview data)
  - **Scopes**: List of allowed read-only scopes and prohibited operations
  - **CLI & Install**: Mock installation commands and example widget code
  - **Submission Checklist**: Pre-submission validation checklist
  - **Test Harness**: Mock event cards (onTransaction, onBudgetAlert, onAccountSync) and sandbox runner

Both pages are linked from the main navigation and footer across all marketing pages. The customer-facing `marketplace.html` includes a banner CTA directing developers to the Developer Marketplace.

**Last Updated:** December 07, 2025 at 08:39 PM
