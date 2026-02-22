# jualuma Infrastructure as Code (IaC)

This directory contains Terraform configurations for managing all GCP infrastructure for the jualuma platform.

## Overview

All GCP infrastructure is managed via Terraform using Google Cloud Foundation Toolkit (CFT) and Fabric modules. This ensures:
- Zero Trust networking architecture (VPC, Private Service Connect, Cloud Armor)
- Reproducible deployments across environments (prod, stage, dev)
- Security guardrails enforced via org policies
- Full auditability of infrastructure changes
- High availability and disaster recovery capabilities

## Directory Structure

```
infra/
├── README.md                 # This file
├── versions.tf              # Terraform and provider version constraints
├── backend.tf.example       # Example backend configuration (copy to backend.tf)
├── bootstrap/               # Create the GCS+KMS backend (run once per project)
├── modules/                 # Reusable Terraform modules
│   ├── network/            # VPC, subnets, firewall rules
│   ├── nat/                # Cloud NAT configuration
│   ├── psc/                # Private Service Connect (Google APIs, Cloud SQL)
│   ├── dns-policy/         # DNS policy (googleapis.com → PSC)
│   ├── cloud-sql/          # Cloud SQL (private IP, HA)
│   ├── cloud-run/          # Cloud Run service wrapper
│   ├── serverless-connector/# Serverless VPC Connector
│   ├── artifact-registry/   # Artifact Registry repositories
│   ├── lb-https/           # HTTPS Load Balancer + Cloud Armor + CDN
│   ├── org-policies/       # Organization policies
│   └── log-export/         # Log export sinks
└── envs/                    # Environment-specific configurations
    ├── prod/               # Production environment
    │   └── main.tf
    ├── stage/              # Staging environment
    │   └── main.tf
    └── dev/                # Development environment
        └── main.tf
```

## Prerequisites

1. **GCP Account Setup:**
   - Create GCP projects: `jualuma-prod`, `jualuma-stage`, `jualuma-dev`
   - Enable required APIs (see `getting started gcp.md`)
   - Set up billing accounts and alerts

2. **Terraform Installation:**
   ```bash
   # Install Terraform (version 1.5+)
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads
   ```

3. **GCP Authentication:**
   ```bash
   # Authenticate with GCP
   gcloud auth application-default login

   # Set project
   gcloud config set project jualuma-prod  # or jualuma-stage, jualuma-dev
   ```

4. **Bootstrap State Backend:**
   - Use `infra/bootstrap` to create the CMEK-encrypted GCS bucket (recommended), or create the bucket+KMS manually in GCP
   - Copy the per-environment backend template to each env root:
     - `infra/envs/dev/backend.tf.example` → `infra/envs/dev/backend.tf`
     - `infra/envs/stage/backend.tf.example` → `infra/envs/stage/backend.tf`
     - `infra/envs/prod/backend.tf.example` → `infra/envs/prod/backend.tf`

## Module Sources

All modules use Google Cloud Foundation Toolkit (CFT) or Fabric modules:

- **Network:** `terraform-google-network` (CFT)
- **NAT:** `terraform-google-cloud-nat` (CFT)
- **PSC:** `cloud-foundation-fabric/modules/psc-google-apis` and `psc-cloud-sql`
- **DNS Policy:** `cloud-foundation-fabric/modules/dns-policy` or `terraform-google-cloud-dns` samples
- **Cloud SQL:** `terraform-google-sql-db` (CFT)
- **Cloud Run:** `terraform-google-cloud-run` (CFT)
- **Artifact Registry:** `google_artifact_registry_repository` (provider resource; wrap for consistency)
- **Serverless Connector:** `terraform-google-vpc-serverless-connector` (CFT)
- **LB HTTPS:** `terraform-google-lb-http` (CFT) + `terraform-google-cloud-armor` (CFT)
- **Org Policies:** `terraform-google-org-policy` (CFT)
- **Log Export:** `terraform-google-log-export` (CFT)

## Usage

### Initialize Terraform

```bash
cd envs/prod  # or stage, dev
terraform init
```

### Plan Changes

```bash
terraform plan
```

Review the plan carefully. It shows what resources will be created, modified, or destroyed.

### Apply Changes

```bash
terraform apply
```

**IMPORTANT:** Manual approval is required for all applies. Review the plan output carefully before confirming.

### Destroy Resources

```bash
terraform destroy
```

**WARNING:** This will destroy all infrastructure in the environment. Use with extreme caution.

## Deployment Order

Deploy infrastructure in this order:

1. **Bootstrap:** State backend (GCS bucket + KMS)
2. **Network Core:** VPC, subnets, firewall baseline, NAT
3. **PSC + DNS:** Google APIs PSC, Cloud SQL PSC/private IP, DNS policy
4. **Cloud SQL:** HA instance (private), backups/PITR
5. **Serverless Connector:** Create VPC connector
6. **Cloud Run Services:** Deploy with authenticated ingress internal+LB, attach connector
7. **LB/Armor/CDN:** HTTPS LB with Armor WAF/rate limits, serverless NEG
8. **Org Policies:** Enforce security guardrails
9. **Log Exports:** Set up logging sinks
10. **Billing Alerts:** Configure cost monitoring

## CI/CD Integration

### Pre-commit Checks

Run these checks before committing:

```bash
terraform fmt -recursive
terraform validate
tflint
tfsec  # or checkov
```

### CI Pipeline

The CI pipeline should:
1. Run `terraform fmt -check`
2. Run `terraform validate`
3. Run `tflint`
4. Run `tfsec/checkov` for security scanning
5. Run `terraform plan` and save output as artifact
6. Require manual approval for applies

### Policy Checks

The CI pipeline blocks deployments if:
- Cloud Run ingress is public (`--allow-unauthenticated` on protected services)
- Cloud SQL has public IP enabled
- Org policy violations detected
- Terraform validation fails

## Security Guardrails

### Org Policies (Enforced via Terraform)

- **Disable External IPs:** No VM instances can have external IPs
- **Disable SA Key Creation:** Service account keys cannot be created
- **Restrict CMEK Projects:** Enforce CMEK for Cloud SQL audit schema, critical buckets
- **Restrict APIs/Domains:** Limit allowed APIs and external domains where feasible

### Network Security

- **Zero Trust:** No implicit trust between services
- **Private Access:** Cloud SQL, Secret Manager, KMS accessed via Private Service Connect only
- **Egress Control:** All egress via Cloud NAT with allow-list policies
- **Ingress Protection:** HTTPS Load Balancer with Cloud Armor WAF

### Access Control

- **Service Accounts:** One SA per service with least privilege IAM
- **Cloud Run:** All services require authentication (no `--allow-unauthenticated` except explicit public assets)
- **State Locking:** GCS backend prevents concurrent modifications

## Cost Considerations

Additional networking costs (adds to base infrastructure costs):

- **Load Balancer:** ~$18/month base + traffic
- **Cloud Armor:** ~$5/month base + per-request pricing
- **Cloud NAT:** ~$45/month per NAT gateway + egress charges
- **VPC Flow Logs:** ~$0.50 per GB ingested
- **Cloud CDN:** Included with Load Balancer (no additional cost)

**Estimated additional networking costs: ~$70-100/month**

Monitor costs via Cloud Billing dashboards and set alerts at $200, $500, $1,000 thresholds.

## Troubleshooting

### State Lock Issues

If Terraform state is locked:

```bash
# Check who has the lock
terraform force-unlock <LOCK_ID>
```

Only use `force-unlock` if you're certain no other process is running.

### Module Version Conflicts

If you encounter module version conflicts:

1. Check `versions.tf` for version constraints
2. Update module source URLs to specific versions
3. Run `terraform init -upgrade` to update providers

### Authentication Issues

If you encounter authentication errors:

```bash
# Re-authenticate
gcloud auth application-default login

# Verify project
gcloud config get-value project
```

## Related Documentation

- **Master App Dev Guide:** Section 3.3 (Infrastructure Delivery & Networking Architecture)
- **Security Architecture:** Section 2.3 (Network Security Architecture)
- **GCP Setup:** `getting started gcp.md` (Cost optimization, IaC setup)
- **Local Development:** `Local App Dev Guide.md` (Terraform not used locally)

## Support

For infrastructure issues:
1. Check Terraform plan output for errors
2. Review Cloud Console for resource status
3. Check Cloud Logging for service errors
4. Review Security Command Center for security findings

---

**Last Updated:** December 07, 2025 at 08:39 PM
