# Documentation: testmail.app Core Features Reference

# Last Modified: 2025-12-23T22:05:00-06:00

## Core Purpose

This document outlines the technical features and capabilities of testmail.app for automated email testing and programmatic inbox management within the JuaLuma ecosystem.

---

## 1. Namespace System

The **Namespace** is the core organizational unit in testmail.app.

- **Permanent Container:** Every account is assigned a unique namespace (e.g., `cm7vxy`).
- **Isolation:** It acts as a permanent, private container for all incoming emails assigned to your account.
- **Global Uniqueness:** Namespaces ensure that your test data does not collide with other users.

## 2. Dynamic Tagging

Testmail.app allows for the creation of on-the-fly email addresses without any prior configuration.

- **Syntax:** `{namespace}.{tag}@inbox.testmail.app`
- **Unlimited Addresses:** By changing the `{tag}` part of the address, you can create an infinite number of unique email addresses for different test cases (e.g., `cm7vxy.user123@inbox.testmail.app`, `cm7vxy.checkout_test@inbox.testmail.app`).
- **Programmability:** Perfect for parallel testing where each test runner requires a unique identity.

## 3. API Access

Full programmatic control is provided through comprehensive API support.

- **REST API:** Standard HTTP endpoints for retrieving emails, deleting messages, and managing account settings.
- **GraphQL API:** A powerful Graph Query Language interface that allows for precise data fetching, reducing over-fetching and enabling complex queries over your inbox state.
- **Authentication:** Secured via API keys passed in the request headers.

## 4. Live Webhooks

Real-time integration with external systems.

- **Instant Notifications:** Configure webhooks to send HTTP POST payloads to your defined endpoints the moment an email is received.
- **Event-Driven Testing:** Trigger automated test suites or backend processes immediately upon receipt of a verification code or system notification.

## 5. Search and Filtering

Powerful querying capabilities to locate specific messages.

- **Tag Filtering:** Filter results to only show emails sent to a specific dynamic tag.
- **Metadata Queries:** Search based on sender address, subject lines, or specific timestamps.
- **Advanced Sorting:** Retrieve emails in chronological or reverse-chronological order to find the latest verification tokens.

## 6. Automated Content Verification

Built-in features for deep message inspection.

- **HTML Content:** Programmatically verify the structure and content of HTML-formatted emails.
- **Text Extraction:** Easily extract plain text versions of messages for simple string matching.
- **Attachment Handling:** Access and verify file attachments programmatically to ensure reports or invoices are correctly delivered.

## 7. Retention Policy

Automated lifecycle management of test data.

- **Tier-Based Cleanup:** Email retention is determined by the account tier.
- **Free Accounts:** Typically feature a 24-hour retention window, after which emails are automatically purged.
- **Professional Tiers:** Offer extended retention periods for longer-running test cycles or auditing requirements.
