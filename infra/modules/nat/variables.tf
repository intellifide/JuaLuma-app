variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for router and NAT."
  type        = string
}

variable "network_self_link" {
  description = "VPC network self link."
  type        = string
}

variable "router_name" {
  description = "Cloud Router name."
  type        = string
}

variable "nat_name" {
  description = "Cloud NAT name."
  type        = string
}

variable "enable_logging" {
  description = "Enable NAT logging."
  type        = bool
  default     = true
}
