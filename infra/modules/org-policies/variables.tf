variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "boolean_constraints" {
  description = "Boolean org policy constraints by name."
  type        = map(bool)
  default = {
    "constraints/iam.disableServiceAccountKeyCreation" = true
  }
}
