# jualuma App - GCP Deployment Setup Guide

**Status:** Future Phase (Post Local Development)

---

## Overview

This guide outlines the Google Cloud Platform (GCP) infrastructure setup and deployment process for the jualuma application. This phase begins **after** local development is complete and tested.

**⚠️ Important:** Do NOT execute these steps until local development is complete and you have approval to proceed with cloud deployment.

---

## Prerequisites

Before beginning GCP setup:

- ✅ Local development environment fully functional
- ✅ All core features tested locally
- ✅ Code reviewed and approved
- ✅ Security review completed
- ✅ Budget approved for cloud resources
- ✅ GCP billing account created
- ✅ Domain name registered (if applicable)

---

## Phase 1: GCP Project Setup

### Step 1: Create GCP Projects

You'll need three separate projects for different environments:

```bash

# Development environment

gcloud projects create jualuma-dev --name="jualuma Development"

# Staging environment

gcloud projects create jualuma-stage --name="jualuma Staging"

# Production environment

gcloud projects create jualuma-prod --name="jualuma Production"
```

### Step 2: Link Billing Account

```bash

# List billing accounts

gcloud billing accounts list

# Link billing to projects

gcloud billing projects link jualuma-dev --billing-account=<BILLING_ACCOUNT_ID>
gcloud billing projects link jualuma-stage --billing-account=<BILLING_ACCOUNT_ID>
gcloud billing projects link jualuma-prod --billing-account=<BILLING_ACCOUNT_ID>
```

### Step 3: Enable Required APIs

Create `scripts/enable-apis.sh`:

```bash
#!/bin/bash

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./enable-apis.sh <project-id>"
    exit 1
fi

echo "Enabling APIs for project: $PROJECT_ID"

gcloud services enable \
    compute.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    firestore.googleapis.com \
    pubsub.googleapis.com \
    secretmanager.googleapis.com \
    cloudscheduler.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    cloudkms.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    aiplatform.googleapis.com \
    vpcaccess.googleapis.com \
    servicenetworking.googleapis.com \
    dns.googleapis.com \
    --project=$PROJECT_ID

echo "APIs enabled successfully"
```

Run for each environment:

```bash
chmod +x scripts/enable-apis.sh
./scripts/enable-apis.sh jualuma-dev
./scripts/enable-apis.sh jualuma-stage
./scripts/enable-apis.sh jualuma-prod
```

---

## Phase 2: Terraform Infrastructure Setup

### Step 1: Install Terraform

```bash

# macOS

brew install terraform

# Verify installation

terraform version
```

### Step 2: Create Terraform State Backend

```bash

# Create GCS bucket for Terraform state

gsutil mb -p jualuma-prod -l us-central1 gs://jualuma-terraform-state

# Enable versioning

gsutil versioning set on gs://jualuma-terraform-state

# Create KMS keyring and key for encryption

gcloud kms keyrings create terraform-state \
    --location=us-central1 \
    --project=jualuma-prod

gcloud kms keys create terraform-state-key \
    --location=us-central1 \
    --keyring=terraform-state \
    --purpose=encryption \
    --project=jualuma-prod
```

### Step 3: Configure Backend

Create `infra/backend.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket  = "jualuma-terraform-state"
    prefix  = "terraform/state"
    encryption_key = "projects/jualuma-prod/locations/us-central1/keyRings/terraform-state/cryptoKeys/terraform-state-key"
  }
}
```

### Step 4: Initialize Terraform

```bash
cd infra/envs/dev
terraform init
terraform workspace new dev

cd ../stage
terraform init
terraform workspace new stage

cd ../prod
terraform init
terraform workspace new prod
```

---

## Phase 3: Network Infrastructure

### Step 1: Create VPC Networks

The network module creates:

- VPC with custom subnets
- Private Service Connect endpoints
- Cloud NAT for egress
- Firewall rules

```bash
cd infra/envs/dev
terraform plan -target=module.network
terraform apply -target=module.network
```

### Step 2: Configure DNS

```bash

# Create Cloud DNS zone (if using custom domain)

gcloud dns managed-zones create jualuma-zone \
    --dns-name="jualuma.app." \
    --description="jualuma production DNS zone" \
    --project=jualuma-prod
```

### Step 3: Reserve Static IPs

```bash

# Reserve global IP for load balancer

gcloud compute addresses create jualuma-lb-ip \
    --global \
    --ip-version=IPV4 \
    --project=jualuma-prod
```

---

## Phase 4: Database Setup

### Step 1: Deploy Cloud SQL Instance

```bash
cd infra/envs/dev
terraform plan -target=module.cloud_sql
terraform apply -target=module.cloud_sql
```

This creates:

- PostgreSQL 16 instance with pgvector
- Private IP configuration
- Automated backups
- High availability (prod only)

### Step 2: Initialize Database Schema

```bash

# Get Cloud SQL connection name

gcloud sql instances describe jualuma-db-dev \
    --project=jualuma-dev \
    --format="value(connectionName)"

# Connect using Cloud SQL Proxy

cloud_sql_proxy -instances=<CONNECTION_NAME>=tcp:5432

# In another terminal, run migrations

psql "host=127.0.0.1 port=5432 dbname=jualuma user=jualuma_admin" < scripts/init-db.sql
```

### Step 3: Setup Firestore

```bash

# Create Firestore database in Datastore mode

gcloud firestore databases create \
    --type=datastore-mode \
    --location=us-central1 \
    --project=jualuma-dev
```

---

## Phase 5: Secret Management

### Step 1: Create Secrets

```bash

# Create secrets in Secret Manager

echo -n "your-plaid-client-id" | gcloud secrets create plaid-client-id \
    --data-file=- \
    --replication-policy=automatic \
    --project=jualuma-dev

echo -n "your-plaid-secret" | gcloud secrets create plaid-secret \
    --data-file=- \
    --replication-policy=automatic \
    --project=jualuma-dev

echo -n "your-stripe-secret-key" | gcloud secrets create stripe-secret-key \
    --data-file=- \
    --replication-policy=automatic \
    --project=jualuma-dev

echo -n "your-jwt-secret" | gcloud secrets create jwt-secret \
    --data-file=- \
    --replication-policy=automatic \
    --project=jualuma-dev
```

### Step 2: Grant Access to Service Accounts

```bash

# Grant Cloud Run service account access to secrets

gcloud secrets add-iam-policy-binding plaid-client-id \
    --member="serviceAccount:jualuma-backend@jualuma-dev.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=jualuma-dev
```

---

## Phase 6: Container Registry Setup

### Step 1: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create jualuma-containers \
    --repository-format=docker \
    --location=us-central1 \
    --description="jualuma application containers" \
    --project=jualuma-dev
```

### Step 2: Configure Docker Authentication

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## Phase 7: Cloud Run Deployment

### Step 1: Build Backend Container

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code

COPY . .

# Run as non-root user

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port

EXPOSE 8080

# Run application

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Build and push:

```bash
cd backend
docker build -t us-central1-docker.pkg.dev/jualuma-dev/jualuma-containers/backend:latest .
docker push us-central1-docker.pkg.dev/jualuma-dev/jualuma-containers/backend:latest
```

### Step 2: Deploy Backend to Cloud Run

```bash
gcloud run deploy jualuma-backend \
    --image=us-central1-docker.pkg.dev/jualuma-dev/jualuma-containers/backend:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-env-vars="APP_ENV=dev" \
    --set-secrets="PLAID_CLIENT_ID=plaid-client-id:latest,PLAID_SECRET=plaid-secret:latest" \
    --vpc-connector=jualuma-connector \
    --vpc-egress=private-ranges-only \
    --project=jualuma-dev
```

### Step 3: Deploy Frontend to Cloud Storage

```bash

# Build frontend

cd frontend
pnpm build

# Upload to Cloud Storage

gsutil -m rsync -r -d dist/ gs://jualuma-frontend-dev

# Set public access

gsutil iam ch allUsers:objectViewer gs://jualuma-frontend-dev
```

---

## Phase 8: Load Balancer Setup

### Step 1: Deploy Load Balancer

```bash
cd infra/envs/dev
terraform plan -target=module.lb_https
terraform apply -target=module.lb_https
```

This creates:

- Global HTTPS load balancer
- SSL certificate (managed or custom)
- Cloud Armor security policy
- Backend services for Cloud Run and Cloud Storage

### Step 2: Configure Cloud Armor

```bash

# Create security policy

gcloud compute security-policies create jualuma-armor-policy \
    --description="jualuma Cloud Armor policy" \
    --project=jualuma-dev

# Add OWASP rules

gcloud compute security-policies rules create 1000 \
    --security-policy=jualuma-armor-policy \
    --expression="evaluatePreconfiguredExpr('xss-stable')" \
    --action=deny-403 \
    --project=jualuma-dev

gcloud compute security-policies rules create 1001 \
    --security-policy=jualuma-armor-policy \
    --expression="evaluatePreconfiguredExpr('sqli-stable')" \
    --action=deny-403 \
    --project=jualuma-dev

# Add rate limiting

gcloud compute security-policies rules create 2000 \
    --security-policy=jualuma-armor-policy \
    --expression="true" \
    --action=rate-based-ban \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=600 \
    --project=jualuma-dev
```

---

## Phase 9: Monitoring & Logging

### Step 1: Configure Log Exports

```bash
cd infra/envs/dev
terraform plan -target=module.log_export
terraform apply -target=module.log_export
```

### Step 2: Create Monitoring Dashboards

```bash

# Create custom dashboard

gcloud monitoring dashboards create --config-from-file=monitoring/jualuma-dashboard.json \
    --project=jualuma-dev
```

### Step 3: Setup Alerting

Create `monitoring/alerts.yaml`:

```yaml
displayName: "jualuma Alerts"
conditions:

  - displayName: "High Error Rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'
      comparison: COMPARISON_GT
      thresholdValue: 10
      duration: 300s

  - displayName: "High Latency"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"'
      comparison: COMPARISON_GT
      thresholdValue: 1000
      duration: 300s
```

Apply alerts:

```bash
gcloud alpha monitoring policies create --policy-from-file=monitoring/alerts.yaml \
    --project=jualuma-dev
```

---

## Phase 10: CI/CD Pipeline Setup

### Step 1: Create Cloud Build Configuration

Create `cloudbuild.yaml`:

```yaml
steps:
  # Lint and format

  - name: 'python:3.11'
    entrypoint: 'bash'
    args:

      - '-c'
      - |
        pip install ruff mypy
        ruff check backend/
        mypy backend/

  # Run tests

  - name: 'python:3.11'
    entrypoint: 'bash'
    args:

      - '-c'
      - |
        pip install -r backend/requirements.txt
        pytest backend/tests/

  # Build backend container

  - name: 'gcr.io/cloud-builders/docker'
    args:

      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:latest'
      - 'backend/'

  # Push container

  - name: 'gcr.io/cloud-builders/docker'
    args:

      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:$COMMIT_SHA'

  # Deploy to Cloud Run

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:

      - 'run'
      - 'deploy'
      - 'jualuma-backend'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'

  # Build frontend

  - name: 'node:20'
    entrypoint: 'bash'
    args:

      - '-c'
      - |
        cd frontend
        npm install -g pnpm
        pnpm install
        pnpm build

  # Deploy frontend to Cloud Storage

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:

      - '-c'
      - |
        gsutil -m rsync -r -d frontend/dist/ gs://jualuma-frontend-$PROJECT_ID

images:

  - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/jualuma-containers/backend:latest'

options:
  machineType: 'N1_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
```

### Step 2: Create Build Triggers

```bash

# Create trigger for main branch

gcloud builds triggers create github \
    --repo-name=jualuma-app \
    --repo-owner=<your-github-org> \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --project=jualuma-dev
```

---

## Phase 11: Security Hardening

### Step 1: Enable Organization Policies

```bash

# Disable external IPs

gcloud resource-manager org-policies set-policy \
    --project=jualuma-prod \
    policies/disable-external-ips.yaml

# Disable service account key creation

gcloud resource-manager org-policies set-policy \
    --project=jualuma-prod \
    policies/disable-sa-key-creation.yaml
```

### Step 2: Configure IAM

```bash

# Create service accounts with least privilege

gcloud iam service-accounts create jualuma-backend \
    --display-name="jualuma Backend Service Account" \
    --project=jualuma-dev

# Grant minimal permissions

gcloud projects add-iam-policy-binding jualuma-dev \
    --member="serviceAccount:jualuma-backend@jualuma-dev.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding jualuma-dev \
    --member="serviceAccount:jualuma-backend@jualuma-dev.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
```

### Step 3: Enable Security Command Center

```bash
gcloud services enable securitycenter.googleapis.com --project=jualuma-prod
```

---

## Phase 12: Cost Management

### Step 1: Set Budget Alerts

```bash

# Create budget

gcloud billing budgets create \
    --billing-account=<BILLING_ACCOUNT_ID> \
    --display-name="jualuma Dev Budget" \
    --budget-amount=500USD \
    --threshold-rule=percent=50 \
    --threshold-rule=percent=90 \
    --threshold-rule=percent=100
```

### Step 2: Configure Cost Controls

Create budget automation:

```bash

# Create Pub/Sub topic for budget alerts

gcloud pubsub topics create budget-alerts --project=jualuma-dev

# Create Cloud Function to disable services on budget breach

# (Implementation in separate function deployment)

```

---

## Phase 13: Disaster Recovery Setup

### Step 1: Configure Backups

```bash

# Cloud SQL automated backups (already enabled by Terraform)

gcloud sql instances patch jualuma-db-prod \
    --backup-start-time=02:00 \
    --retained-backups-count=30 \
    --project=jualuma-prod

# Firestore export schedule

gcloud firestore export gs://jualuma-firestore-backups-prod \
    --project=jualuma-prod
```

### Step 2: Setup Cross-Region Replication

```bash

# Create Cloud Storage bucket for disaster recovery

gsutil mb -p jualuma-prod -l us-east1 gs://jualuma-dr-backup

# Enable replication

gsutil rewrite -r gs://jualuma-frontend-prod/* gs://jualuma-dr-backup/
```

### Step 3: Document Recovery Procedures

Create `docs/disaster-recovery.md` with:

- RTO/RPO targets
- Failover procedures
- Contact information
- Testing schedule

---

## Phase 14: Production Deployment Checklist

Before deploying to production:

### Pre-Deployment Checklist

- [ ] All tests passing in dev/stage environments
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Load testing completed
- [ ] Disaster recovery tested
- [ ] Monitoring and alerting configured
- [ ] Budget alerts configured
- [ ] Legal documents reviewed and approved
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Compliance checklist completed
- [ ] Backup and restore procedures tested
- [ ] Incident response plan documented
- [ ] On-call rotation established

### Deployment Steps

1. **Deploy to Staging:**
   ```bash
   cd infra/envs/stage
   terraform plan
   terraform apply
   ```

2. **Run Smoke Tests:**
   ```bash
   ./scripts/smoke-tests.sh stage
   ```

3. **Deploy to Production:**
   ```bash
   cd infra/envs/prod
   terraform plan
   terraform apply
   ```

4. **Monitor Deployment:**
   - Check Cloud Run logs
   - Verify health checks
   - Monitor error rates
   - Check latency metrics

5. **Verify Functionality:**
   - Test authentication
   - Test account linking
   - Test transaction feed
   - Test AI chat
   - Test payment processing

---

## Phase 15: Post-Deployment Operations

### Daily Operations

```bash

# Check service health

gcloud run services describe jualuma-backend \
    --region=us-central1 \
    --project=jualuma-prod

# View logs

gcloud logging read "resource.type=cloud_run_revision" \
    --limit=50 \
    --project=jualuma-prod

# Check metrics

gcloud monitoring time-series list \
    --filter='metric.type="run.googleapis.com/request_count"' \
    --project=jualuma-prod
```

### Weekly Maintenance

- Review error logs
- Check cost reports
- Review security alerts
- Update dependencies
- Review performance metrics

### Monthly Tasks

- Security patch updates
- Backup verification
- Disaster recovery drill
- Cost optimization review
- Capacity planning

---

## Troubleshooting

### Common Issues

**Cloud Run Service Not Starting:**
```bash

# Check logs

gcloud run services logs read jualuma-backend \
    --region=us-central1 \
    --project=jualuma-dev

# Check service configuration

gcloud run services describe jualuma-backend \
    --region=us-central1 \
    --project=jualuma-dev
```

**Database Connection Issues:**
```bash

# Test Cloud SQL connectivity

gcloud sql connect jualuma-db-dev --user=jualuma_admin --project=jualuma-dev

# Check VPC connector

gcloud compute networks vpc-access connectors describe jualuma-connector \
    --region=us-central1 \
    --project=jualuma-dev
```

**High Costs:**
```bash

# Analyze costs

gcloud billing accounts describe <BILLING_ACCOUNT_ID>

# Check resource usage

gcloud compute instances list --project=jualuma-dev
gcloud run services list --project=jualuma-dev
```

---

## Important Security Notes

### Never Do This

- ❌ Don't commit secrets to version control
- ❌ Don't use default service accounts
- ❌ Don't allow unauthenticated access to sensitive APIs
- ❌ Don't disable security features for convenience
- ❌ Don't skip security reviews

### Always Do This

- ✅ Use Secret Manager for all secrets
- ✅ Follow principle of least privilege
- ✅ Enable audit logging
- ✅ Use private networking where possible
- ✅ Regularly review IAM permissions
- ✅ Keep dependencies updated
- ✅ Monitor security alerts

---

## Resources

### GCP Documentation

- **Cloud Run:** https://cloud.google.com/run/docs
- **Cloud SQL:** https://cloud.google.com/sql/docs
- **Firestore:** https://cloud.google.com/firestore/docs
- **Secret Manager:** https://cloud.google.com/secret-manager/docs
- **VPC:** https://cloud.google.com/vpc/docs
- **Cloud Armor:** https://cloud.google.com/armor/docs

### Internal Documentation

- **Master App Dev Guide:** `docs/Master App Dev Guide.md`
- **Security Architecture:** `docs/Security-Architecture.md`
- **Infrastructure README:** `infra/README.md`
- **Local runtime (docker-compose):** `docker-compose.yml`

---

## Next Steps

After GCP setup is complete:

1. **Monitor Production:** Set up 24/7 monitoring and alerting
2. **Optimize Performance:** Review and optimize based on real usage
3. **Scale Infrastructure:** Adjust resources based on demand
4. **Iterate Features:** Deploy new features through CI/CD pipeline
5. **Maintain Security:** Regular security audits and updates

---

**Status:** Awaiting Local Development Completion
**Deployment Target:** Q1 2026 (Estimated)

**Last Updated:** December 19, 2025 at 01:50 PM CT (Modified 12/19/2025 13:50 Central Time per rules)
