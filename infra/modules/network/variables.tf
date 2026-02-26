variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "network_name" {
  description = "VPC network name."
  type        = string
}

variable "auto_create_subnetworks" {
  description = "Whether to auto-create subnetworks."
  type        = bool
  default     = false
}

variable "routing_mode" {
  description = "VPC routing mode."
  type        = string
  default     = "REGIONAL"
}

variable "delete_default_routes_on_create" {
  description = "Whether to delete default internet routes on create."
  type        = bool
  default     = false
}

variable "subnets" {
  description = "Subnets to create."
  type = list(object({
    name                     = string
    ip_cidr_range            = string
    region                   = string
    private_ip_google_access = optional(bool)
  }))
}
