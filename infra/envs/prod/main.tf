# Production Environment Infrastructure
#
# This file composes Terraform modules to create the production infrastructure.
#
# Deployment Order:
# 1. Bootstrap: State backend (GCS bucket + KMS)
# 2. Network Core: VPC, subnets, firewall baseline, NAT
# 3. PSC + DNS: Google APIs PSC, Cloud SQL PSC/private IP, DNS policy
# 4. Cloud SQL: HA instance (private), backups/PITR
# 5. Serverless Connector: Create VPC connector
# 6. Cloud Run Services: Deploy with authenticated ingress internal+LB, attach connector
# 7. LB/Armor/CDN: HTTPS LB with Armor WAF/rate limits, serverless NEG
# 8. Org Policies: Enforce security guardrails
# 9. Log Exports: Set up logging sinks
# 10. Billing Alerts: Configure cost monitoring

terraform {
  # Backend configuration should be in backend.tf (not committed to version control)
  # See backend.tf.example for template
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP project ID for production"
  type        = string
  default     = "jualuma-prod"  # Update with actual project ID
}

variable "region" {
  description = "GCP region for primary deployment"
  type        = string
  default     = "us-central1"
}

variable "secondary_region" {
  description = "GCP region for DR/secondary deployment"
  type        = string
  default     = "us-east1"
}

variable "artifact_registry_repo_id" {
  description = "Artifact Registry Docker repository id."
  type        = string
  default     = "jualuma-repo"
}

# TODO: Add module calls here following the deployment order above
# Example structure:
#
# module "network" {
#   source = "../../modules/network"
#   # ... inputs
# }
#
# module "nat" {
#   source = "../../modules/nat"
#   # ... inputs
# }
#
# etc.

# See module README files in infra/modules/ for required inputs and outputs

module "artifact_registry" {
  source        = "../../modules/artifact-registry"
  project_id    = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repo_id
}
