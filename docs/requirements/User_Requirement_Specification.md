# User Requirement Specification (URS)

## 1. Introduction

This document defines the user requirements for the jualuma Application, focusing on the needs of various user personas including End Users, Marketplace Developers, and Support Agents.

## 2. User Personas

### 2.1 Standard App User ("The Consumer")

* **Description**: The primary user of the platform seeking financial clarity.
* **Segments**:
  * **The Beginner (Free Tier)**: Has 1-2 accounts. Needs immediate value through automated categorization and budget visualization.
  * **The Overwhelmed (Pro/Essential Tier)**: Has multiple accounts (Bank, Crypto, Investment). Needs a unified view to manage complexity.
  * **The Power User (Ultimate Tier)**: Deeply engaged, manages family finances or complex portfolios. Needs advanced reporting and high AI quotas.

### 2.2 Marketplace Developer ("The Creator")

* **Description**: A third-party developer who builds and publishes widgets for the jualuma Marketplace.
* **Prerequisites**: Must subscribe to Pro or Ultimate tier and execute a Developer Agreement.
* **Needs**: Robust SDK, testing tools, and transparency in payouts and engagement metrics.

### 2.3 Support Staff ("The Agent")

* **Description**: Internal or contracted customer support representatives.
* **Roles**: `support_agent` (standard tickets), `support_manager` (escalations).
* **Needs**: A dedicated portal to view user context (masked PII) and manage tickets without accessing the main app interface.

## 3. User Stories

### 3.1 Authentication & Onboarding

* **URS-01**: As a user, I want to sign up using Email or Google so that I can securely access my data.
* **URS-02**: As a user, I must accept the Terms of Service and Privacy Policy before accessing the app.
* **URS-03**: As a user, I want to seamlessly upgrade my subscription (Free -> Essential -> Pro -> Ultimate) via Stripe.

### 3.2 Account Aggregation (The "Sync")

* **URS-04**: As a user, I want to link my bank accounts (via Plaid) to see my transactions.
* **URS-05**: As a Pro user, I want to link my Investment accounts and Crypto Wallets (CEX/Web3) to see my Net Worth.
* **URS-06**: As a user, I want to manually add assets (House, Car) that don't have APIs.

### 3.3 Financial Management

* **URS-07**: As a user, I want my transactions to be automatically categorized so I don't have to sort them manually.
* **URS-08**: As a user, I want to set monthly budgets for specific categories and get alerted when I'm close to the limit.
* **URS-09**: As a user, I want to view a "Unified Feed" of all my transactions across all accounts, with search and filter capabilities.

### 3.4 AI Assistant

* **URS-10**: As a user, I want to chat with an AI assistant that knows my financial context (e.g., "How much did I spend on dining last month?").
* **URS-11**: As a user, I want to be informed about my daily AI query quota based on my subscription tier.

### 3.5 Widget Marketplace

* **URS-12**: As a user, I want to browse and install third-party widgets to extend the app's functionality.
* **URS-13**: As a Developer, I want to publish a widget using the jualuma SDK.
* **URS-14**: As a Developer, I want to view my widget's download stats and ratings to track my performance.
* **URS-15**: As a Developer, I want to view my accrued payouts.

### 3.6 Support

* **URS-16**: As a user, I want to submit a support ticket if I have an issue.
* **URS-17**: As a Support Agent, I want to view a user's ticket and limited account status to assist them.

## 4. User Flows

### 4.1 Onboarding Flow

`Landing Page` -> `Sign Up (Firebase)` -> `Legal Acceptance` -> `Onboarding Wizard` -> `Link First Account (Plaid)` -> `Dashboard`.

### 4.2 Developer Publishing Flow

`Settings` -> `Developer Mode` -> `Sign Agreement` -> `Upload Widget Package` -> `Automated Validation` -> `Pending Review` -> `Published`.

### 4.3 Support Ticket Flow

`User: Help Page` -> `Submit Ticket` -> `System: Auto-Response` -> `Agent: View in Support Portal` -> `Agent: Responder` -> `User: Notification`.

<!-- Modified: December 19, 2Y at 01:42 PM CT (Modified 12/19/2025 13:42 Central Time per rules) -->

<!-- Modified: December 19, 2025 at 01:42 PM CT (Modified 12/19/2025 13:42 Central Time per rules) -->

**Last Updated:** December 19, 2025 at 01:51 PM CT (Modified 12/19/2025 13:51 Central Time per rules)
