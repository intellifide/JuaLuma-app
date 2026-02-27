# Staging Environment Infrastructure
#
# This stack composes reusable modules and is intentionally feature-flagged.
# Start with read-only plan and import workflows, then enable resources in
# controlled promotion order.

terraform {
  # Backend configuration should be in backend.tf (not committed to version control)
  # See backend.tf.example for template
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  resolved_network_name      = var.network_name != "" ? var.network_name : "${var.project_id}-vpc"
  resolved_network_self_link = var.enable_network ? module.network[0].network_self_link : var.existing_network_self_link
  resolved_vpc_connector     = var.enable_serverless_connector ? module.serverless_connector[0].connector_name : var.existing_vpc_connector
  resolved_subnets = length(var.subnets) > 0 ? var.subnets : [
    {
      name                     = "${var.project_id}-app-subnet"
      ip_cidr_range            = "10.30.0.0/24"
      region                   = var.region
      private_ip_google_access = true
    }
  ]

  resolved_service_accounts = merge(
    var.existing_service_accounts,
    { for role, sa in google_service_account.runtime : role => sa.email }
  )

  cloud_run_services = {
    "jualuma-backend-stage" = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_id}/jualuma-backend-stage:latest"
      ingress               = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
      allow_unauthenticated = false
      service_account       = lookup(local.resolved_service_accounts, "backend", null)
      attach_vpc_connector  = true
      min_instances         = 0
      max_instances         = 10
      cpu                   = "1"
      memory                = "1Gi"
      env = {
        APP_ENV              = "stage"
        GCP_PROJECT_ID       = var.project_id
        PLAID_ENV            = "production"
        PLAID_REDIRECT_URI   = "https://jualuma-user-app-stage-ripznron4a-uc.a.run.app/connect-accounts"
        FRONTEND_URL         = "https://jualuma-user-app-stage-ripznron4a-uc.a.run.app"
        BACKEND_CORS_ORIGINS = "https://jualuma-user-app-stage-ripznron4a-uc.a.run.app"
      }
      secret_env = {
        DATABASE_URL                   = { secret = "DATABASE_URL", version = "latest" }
        STRIPE_SECRET_KEY              = { secret = "STRIPE_SECRET_KEY", version = "latest" }
        STRIPE_WEBHOOK_SECRET          = { secret = "STRIPE_WEBHOOK_SECRET", version = "latest" }
        PLAID_CLIENT_ID                = { secret = "PLAID_CLIENT_ID", version = "latest" }
        PLAID_SECRET                   = { secret = "PLAID_SECRET", version = "latest" }
        JOB_RUNNER_SECRET              = { secret = "JOB_RUNNER_SECRET", version = "latest" }
        LOCAL_ENCRYPTION_KEY           = { secret = "LOCAL_ENCRYPTION_KEY", version = "latest" }
        GOOGLE_APPLICATION_CREDENTIALS = { secret = "GMAIL_SA_KEY", version = "latest" }
        TATUM_API_KEY                  = { secret = "TATUM_API_KEY", version = "latest" }
        TATUM_BASE_URL                 = { secret = "TATUM_BASE_URL", version = "latest" }
        AI_FREE_MODEL                  = { secret = "AI_FREE_MODEL", version = "latest" }
        AI_PAID_FALLBACK_MODEL         = { secret = "AI_PAID_FALLBACK_MODEL", version = "latest" }
      }
    }

    "jualuma-approvals-stage" = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_id}/jualuma-approvals-stage:latest"
      ingress               = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
      allow_unauthenticated = false
      service_account       = lookup(local.resolved_service_accounts, "approvals", null)
      attach_vpc_connector  = false
      min_instances         = 0
      max_instances         = 3
      cpu                   = "1"
      memory                = "512Mi"
      env = {
        APP_ENV                    = "stage"
        GCP_PROJECT_ID             = var.project_id
        GCP_LOCATION               = var.region
        DISPATCH_ALLOWED_JOBS      = "jualuma-backend-stage-migrate"
        DISPATCH_ALLOWED_WORKFLOWS = ""
      }
      secret_env = {
        JOB_RUNNER_SECRET = { secret = "JOB_RUNNER_SECRET", version = "latest" }
      }
    }

    "jualuma-user-app-stage" = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_id}/jualuma-user-app-stage:latest"
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      service_account       = lookup(local.resolved_service_accounts, "frontend", null)
      attach_vpc_connector  = false
      min_instances         = 0
      max_instances         = 10
      cpu                   = "1"
      memory                = "512Mi"
      env                   = { API_UPSTREAM = "https://jualuma-backend-stage-ripznron4a-uc.a.run.app" }
      secret_env            = {}
    }

    "jualuma-support-stage" = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_id}/jualuma-support-stage:latest"
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      service_account       = lookup(local.resolved_service_accounts, "frontend", null)
      attach_vpc_connector  = false
      min_instances         = 0
      max_instances         = 10
      cpu                   = "1"
      memory                = "512Mi"
      env                   = { API_UPSTREAM = "https://jualuma-backend-stage-ripznron4a-uc.a.run.app" }
      secret_env            = {}
    }

    "jualuma-marketing-stage" = {
      image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo_id}/jualuma-marketing-stage:latest"
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      service_account       = lookup(local.resolved_service_accounts, "frontend", null)
      attach_vpc_connector  = false
      min_instances         = 0
      max_instances         = 10
      cpu                   = "1"
      memory                = "512Mi"
      env                   = {}
      secret_env            = {}
    }
  }
}

module "artifact_registry" {
  count          = var.enable_artifact_registry ? 1 : 0
  source         = "../../modules/artifact-registry"
  project_id     = var.project_id
  location       = var.region
  repository_id  = var.artifact_registry_repo_id
  immutable_tags = var.artifact_registry_immutable_tags
}

module "network" {
  count                           = var.enable_network ? 1 : 0
  source                          = "../../modules/network"
  project_id                      = var.project_id
  network_name                    = local.resolved_network_name
  auto_create_subnetworks         = false
  delete_default_routes_on_create = false
  subnets                         = local.resolved_subnets
}

module "nat" {
  count             = var.enable_nat ? 1 : 0
  source            = "../../modules/nat"
  project_id        = var.project_id
  region            = var.region
  network_self_link = local.resolved_network_self_link
  router_name       = "${var.project_id}-router"
  nat_name          = "${var.project_id}-nat"
  enable_logging    = true
}

module "serverless_connector" {
  count         = var.enable_serverless_connector ? 1 : 0
  source        = "../../modules/serverless-connector"
  project_id    = var.project_id
  region        = var.region
  name          = var.serverless_connector_name
  network_name  = local.resolved_network_name
  ip_cidr_range = var.serverless_connector_cidr
}

module "cloud_sql" {
  count               = var.enable_cloud_sql ? 1 : 0
  source              = "../../modules/cloud-sql"
  project_id          = var.project_id
  name                = var.cloud_sql_instance_name
  region              = var.region
  database_version    = var.cloud_sql_database_version
  tier                = var.cloud_sql_tier
  availability_type   = var.cloud_sql_availability_type
  disk_size_gb        = var.cloud_sql_disk_size_gb
  deletion_protection = var.cloud_sql_deletion_protection
  private_network     = local.resolved_network_self_link
}

resource "google_service_account" "runtime" {
  for_each     = var.enable_service_accounts ? var.service_accounts : {}
  project      = var.project_id
  account_id   = each.value
  display_name = "${var.project_id} ${each.key} runtime"
}

module "cloud_run_services" {
  for_each = var.enable_cloud_run ? local.cloud_run_services : {}
  source   = "../../modules/cloud-run"

  project_id = var.project_id
  name       = each.key
  location   = var.region
  image      = each.value.image
  ingress    = each.value.ingress

  service_account = try(each.value.service_account, null)
  vpc_connector   = try(each.value.attach_vpc_connector, false) ? local.resolved_vpc_connector : null
  vpc_egress      = "PRIVATE_RANGES_ONLY"

  env                   = try(each.value.env, {})
  secret_env            = try(each.value.secret_env, {})
  min_instances         = try(each.value.min_instances, 0)
  max_instances         = try(each.value.max_instances, 10)
  cpu                   = try(each.value.cpu, "1")
  memory                = try(each.value.memory, "512Mi")
  allow_unauthenticated = try(each.value.allow_unauthenticated, false)
}

module "log_export" {
  count       = var.enable_log_export && var.log_export_destination != "" ? 1 : 0
  source      = "../../modules/log-export"
  project_id  = var.project_id
  sink_name   = "${var.project_id}-platform-sink"
  destination = var.log_export_destination
  filter      = var.log_export_filter
}

module "org_policies" {
  count               = var.enable_org_policies ? 1 : 0
  source              = "../../modules/org-policies"
  project_id          = var.project_id
  boolean_constraints = var.org_policy_boolean_constraints
}

variable "project_id" {
  description = "GCP project ID for staging"
  type        = string
  default     = "jualuma-stage"
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

variable "artifact_registry_immutable_tags" {
  description = "Enable immutable tags in Artifact Registry."
  type        = bool
  default     = false
}

variable "network_name" {
  description = "Override network name. Empty uses project-based default."
  type        = string
  default     = ""
}

variable "subnets" {
  description = "Override subnets. Empty uses default subnet."
  type = list(object({
    name                     = string
    ip_cidr_range            = string
    region                   = string
    private_ip_google_access = optional(bool)
  }))
  default = []
}

variable "existing_network_self_link" {
  description = "Use an existing VPC self link when network module is disabled."
  type        = string
  default     = null
}

variable "existing_vpc_connector" {
  description = "Use an existing serverless VPC connector when connector module is disabled."
  type        = string
  default     = null
}

variable "serverless_connector_name" {
  description = "Serverless VPC connector name."
  type        = string
  default     = "jualuma-stage-connector"
}

variable "serverless_connector_cidr" {
  description = "CIDR for serverless connector."
  type        = string
  default     = "10.30.10.0/28"
}

variable "cloud_sql_instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "jualuma-db-stage"
}

variable "cloud_sql_database_version" {
  description = "Cloud SQL database version."
  type        = string
  default     = "POSTGRES_15"
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-8192"
}

variable "cloud_sql_availability_type" {
  description = "Cloud SQL availability type."
  type        = string
  default     = "REGIONAL"
}

variable "cloud_sql_disk_size_gb" {
  description = "Cloud SQL disk size in GB."
  type        = number
  default     = 20
}

variable "cloud_sql_deletion_protection" {
  description = "Cloud SQL deletion protection."
  type        = bool
  default     = true
}

variable "service_accounts" {
  description = "Runtime service account account_ids keyed by role. Created only when enable_service_accounts=true."
  type        = map(string)
  default = {
    backend   = "cr-backend"
    approvals = "cr-approvals"
    frontend  = "cr-frontend"
  }
}

variable "existing_service_accounts" {
  description = "Existing runtime service account emails keyed by role."
  type        = map(string)
  default = {
    backend   = "cr-backend@jualuma-stage.iam.gserviceaccount.com"
    approvals = "cr-approvals@jualuma-stage.iam.gserviceaccount.com"
    frontend  = "cr-frontend@jualuma-stage.iam.gserviceaccount.com"
  }
}

variable "log_export_destination" {
  description = "Log sink destination when log export is enabled."
  type        = string
  default     = ""
}

variable "log_export_filter" {
  description = "Log export filter."
  type        = string
  default     = ""
}

variable "org_policy_boolean_constraints" {
  description = "Boolean org policy constraints."
  type        = map(bool)
  default = {
    "constraints/iam.disableServiceAccountKeyCreation" = true
  }
}

variable "enable_artifact_registry" {
  description = "Enable Artifact Registry module."
  type        = bool
  default     = true
}

variable "enable_network" {
  description = "Enable VPC network module."
  type        = bool
  default     = false
}

variable "enable_nat" {
  description = "Enable Cloud NAT module."
  type        = bool
  default     = false
}

variable "enable_serverless_connector" {
  description = "Enable serverless connector module."
  type        = bool
  default     = false
}

variable "enable_cloud_sql" {
  description = "Enable Cloud SQL module."
  type        = bool
  default     = false
}

variable "enable_service_accounts" {
  description = "Enable service account creation."
  type        = bool
  default     = false
}

variable "enable_cloud_run" {
  description = "Enable Cloud Run service module composition."
  type        = bool
  default     = false
}

variable "enable_log_export" {
  description = "Enable log export sink module."
  type        = bool
  default     = false
}

variable "enable_org_policies" {
  description = "Enable org policy enforcement module."
  type        = bool
  default     = false
}

output "artifact_registry_repository_id" {
  description = "Artifact repository resource ID."
  value       = var.enable_artifact_registry ? module.artifact_registry[0].repository_id : null
}

output "network_self_link" {
  description = "Network self link used by this stack."
  value       = local.resolved_network_self_link
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name when enabled."
  value       = var.enable_cloud_sql ? module.cloud_sql[0].instance_connection_name : null
}

output "cloud_run_urls" {
  description = "Cloud Run service URLs when enabled."
  value = {
    for name, service in module.cloud_run_services : name => service.service_url
  }
}
