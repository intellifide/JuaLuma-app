# CI/CD Strategy
## Intellifide, LLC - jualuma Platform


---

## Overview

This document outlines the Continuous Integration and Continuous Deployment (CI/CD) strategy for the jualuma platform, using GitHub Actions for automation, Google Artifact Registry for container storage, and Cloud Run for deployment.

---

## CI/CD Pipeline Architecture

**Workflow:** GitHub Actions → Google Artifact Registry → Cloud Run

### Pipeline Components

1. **Source Control:** GitHub (main repository)
2. **CI/CD Platform:** GitHub Actions
3. **Container Registry:** Google Artifact Registry
4. **Deployment Target:** Cloud Run (Backend), Cloud Storage + CDN (Frontend)
5. **Mobile Distribution:** TestFlight (iOS), Google Play Console (Android)

---

## GitHub Actions Workflows

### Backend Workflow

**Trigger:** Push to main branch or pull request

**Stages:**
1. **Lint & Format:**
   - Ruff (Python linting and formatting)
   - Fail on linting errors or formatting issues

2. **Security Scan:**
   - trivy fs . (container and filesystem scanning)
   - Fail on secrets detected or high/critical vulnerabilities

3. **Unit Tests:**
   - Pytest for Python backend
   - Coverage reporting
   - Fail if coverage drops below threshold

4. **Integration Tests:**
   - Cloud SQL Auth Proxy for database integration tests
   - Test against local PostgreSQL instance
   - Fail on integration test failures

5. **Build:**
   - Build Docker image
   - Tag with commit SHA and branch name
   - Push to Google Artifact Registry

6. **Deploy:**
   - Deploy to Cloud Run with traffic splitting (0% initial traffic)
   - Test new revision
   - Promote to 100% traffic if tests pass

### Frontend Workflow

**Trigger:** Push to main branch or pull request

**Stages:**
1. **Lint & Format:**
   - ESLint (TypeScript/JavaScript linting)
   - Prettier (code formatting)
   - Fail on linting errors or formatting issues

2. **Accessibility Scan:**
   - axe-core on composite glass UI
   - Fail if contrast ratio < 4.5:1
   - Scan Engineered Liquid Glass components

3. **Unit Tests:**
   - Jest/Vitest for React components
   - Coverage reporting
   - Fail if coverage drops below threshold

4. **Build:**
   - React PWA build (Vite)
   - Generate production assets
   - Optimize for production

5. **Deploy:**
   - Upload to Cloud Storage
   - Invalidate Cloud CDN cache
   - Update service worker

### Mobile Workflow

**Trigger:** Release tags (release/*)

**Stages:**
1. **Build PWA:**
   - Build React PWA
   - Generate production assets

2. **Capacitor Sync:**
   - npx cap sync (sync web assets to native projects)

3. **iOS Build:**
   - Generate Xcode project
   - Build .ipa artifact
   - Run Detox smoke tests
   - Upload to TestFlight

4. **Android Build:**
   - Generate Android project
   - Build .aab artifact
   - Run Detox smoke tests
   - Upload to Play Console

5. **Artifact Storage:**
   - Store artifacts in Cloud Storage for audit
   - Tag with release version

---

## Environment Promotion Strategy

### Deployment Environments

**Local Development:**
- Docker Compose for local emulation
- PostgreSQL, Firestore Emulator, Pub/Sub Emulator
- No GCP resources required

**Dev:**
- GCP project `jualuma-dev`, region `us-central1`, Cloud Run services with `-dev` suffix

**Stage:**
- GCP project `jualuma-stage`, region `us-central1`, Cloud Run services with `-stage` suffix

**Prod:**
- GCP project `jualuma-prod`, regions `us-central1` (primary), `us-east1` (DR)
- Cloud Run (Backend)
- Cloud Storage + CDN (Frontend)
- Cloud SQL Enterprise Plus (Database)
- Firestore Datastore Mode (Metering/Cache)

### Traffic Splitting Deployment

**Strategy:** Deploy new revision → Route 0% traffic → Test Live URL → Promote to 100%

**Process:**
1. Deploy new revision to Cloud Run with 0% traffic
2. New revision receives no user traffic initially
3. Test new revision using dedicated test URL
4. Monitor metrics (error rates, latency, resource usage)
5. Gradually increase traffic (0% → 10% → 50% → 100%)
6. Monitor at each stage
7. Rollback if issues detected (instant traffic routing back to previous revision)

**Benefits:**
- Zero-downtime deployments
- Ability to test new revisions in production before full rollout
- Quick rollback capability (no redeployment needed)
- Replaces separate "Sandbox" environment concept

**Rollback Procedure:**
- If issues detected, immediately route 100% traffic back to previous revision
- No need to redeploy - traffic routing is instant
- Previous revision remains available for instant rollback

---

## Testing Gates and Quality Thresholds

### Code Quality Gates

**Linting:**
- Zero linting errors allowed
- All code must pass ESLint/Ruff checks

**Formatting:**
- All code must be formatted with Prettier/Ruff
- Consistent code style enforced

**Security:**
- Zero high/critical vulnerabilities allowed
- No secrets detected in code
- Security scanning must pass

**Accessibility:**
- All UI components must meet WCAG 2.1 AA standards
- Contrast ratio must be ≥ 4.5:1
- Accessibility scanning must pass

### Test Coverage Thresholds

**Backend:**
- Minimum 80% code coverage
- All critical paths must have tests
- Integration tests for database operations

**Frontend:**
- Minimum 75% code coverage
- All components must have tests
- E2E tests for critical user flows

### Performance Thresholds

**Backend:**
- API response time < 200ms (p95)
- Database query time < 100ms (p95)
- No memory leaks detected

**Frontend:**
- Page load time < 2s
- Time to interactive < 3s
- Lighthouse score > 90

---

## Security Scanning Requirements

### Container Scanning

**Tool:** trivy
**Scope:** Docker images, filesystem
**Checks:**
- Known vulnerabilities in dependencies
- Secrets in code or environment
- Misconfigurations

**Action on Failure:**
- Block deployment
- Require fixes before proceeding

### Dependency Scanning

**Tool:** Dependabot (GitHub)
**Scope:** All dependencies (Python, Node.js)
**Checks:**
- Known vulnerabilities
- Outdated dependencies
- License compliance

**Action on Failure:**
- Alert security team
- Block deployment for critical vulnerabilities

### Code Scanning

**Tool:** CodeQL (GitHub)
**Scope:** Source code
**Checks:**
- Security vulnerabilities
- Code quality issues
- Best practices

**Action on Failure:**
- Review findings
- Block deployment for critical issues

---

## Cost Controls in CI/CD

### Resource Limits

**GitHub Actions:**
- Maximum job duration: 30 minutes
- Maximum concurrent jobs: 3
- Use self-hosted runners for cost optimization (if applicable)

**Build Resources:**
- Docker build cache to reduce build time
- Parallel test execution
- Efficient resource usage

### Cost Monitoring

**Metrics:**
- GitHub Actions minutes used
- Artifact Registry storage
- Cloud Run deployment costs

**Alerts:**
- Set budget alerts for CI/CD costs
- Monitor for unusual spending
- Optimize workflows to reduce costs

---

## Deployment Automation

### Automated Deployment Triggers

**Backend:**
- Push to main branch → Automatic deployment
- Pull request → Build and test only (no deployment)
- Release tag → Production deployment

**Frontend:**
- Push to main branch → Automatic deployment
- Pull request → Build and test only (no deployment)

**Mobile:**
- Release tag (release/*) → Build and upload to stores
- Manual approval required for store submissions

### Deployment Automation Features

**Database Migrations:**
- Automated migration execution
- Rollback capability
- Migration testing in CI

**Feature Flags:**
- Remote Config integration
- Gradual feature rollout
- Kill switch capability

**Monitoring Integration:**
- Automatic alerting on deployment
- Health checks post-deployment
- Rollback triggers on errors

---

## Rollback Procedures

### Automatic Rollback Triggers

**Error Rate:**
- If error rate > 5% within 5 minutes of deployment → Automatic rollback

**Latency:**
- If p95 latency > 500ms → Automatic rollback

**Health Checks:**
- If health checks fail → Automatic rollback

### Manual Rollback

**Process:**
1. Identify issue requiring rollback
2. Route 100% traffic to previous revision (instant)
3. Investigate root cause
4. Fix issue in code
5. Redeploy with fix

**Rollback Time:**
- Traffic routing: < 1 second
- Full rollback: < 30 seconds

---

## Related Documents

This CI/CD Strategy relates to the following planning documents:

**App Development Guides:**
- `Master App Dev Guide.md` - Technical specification (Section 9.0: CI/CD & Infrastructure)
- `Local App Dev Guide.md` - Local development setup
- `planning/technical docs/Deployment-Automation.md` - Deployment strategies and patterns

**Technical Documentation:**
- `Security-Architecture.md` - Security architecture (security scanning requirements)
- `Application-Security-Implementation.md` - Security implementation details
- `planning/technical docs/Runtime-Maintenance-Operations.md` - Production monitoring and operations

---

**Last Updated:** December 07, 2025 at 08:39 PM
