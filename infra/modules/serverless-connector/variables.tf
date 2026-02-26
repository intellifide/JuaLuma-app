variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "name" {
  description = "Serverless connector name."
  type        = string
}

variable "region" {
  description = "Region for connector."
  type        = string
}

variable "network_name" {
  description = "VPC network name."
  type        = string
}

variable "ip_cidr_range" {
  description = "Connector CIDR range."
  type        = string
}

variable "min_instances" {
  description = "Minimum connector instances."
  type        = number
  default     = 2
}

variable "max_instances" {
  description = "Maximum connector instances."
  type        = number
  default     = 3
}
