variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "location" {
  description = "Artifact Registry location/region (e.g. us-central1)."
  type        = string
}

variable "repository_id" {
  description = "Repository ID (e.g. jualuma-repo)."
  type        = string
}

variable "description" {
  description = "Repository description."
  type        = string
  default     = null
  nullable    = true
}

variable "immutable_tags" {
  description = "If true, prevent tag overwrites (recommended for prod once CI is stable)."
  type        = bool
  default     = false
}
