variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "name" {
  description = "Cloud Run service name."
  type        = string
}

variable "location" {
  description = "Cloud Run region."
  type        = string
}

variable "image" {
  description = "Container image URL."
  type        = string
}

variable "ingress" {
  description = "Ingress policy."
  type        = string
  default     = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
}

variable "service_account" {
  description = "Service account email. Null means platform default account."
  type        = string
  default     = null
}

variable "vpc_connector" {
  description = "VPC connector resource name."
  type        = string
  default     = null
}

variable "vpc_egress" {
  description = "VPC egress policy."
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
}

variable "env" {
  description = "Plain env vars."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Secret env vars."
  type = map(object({
    secret  = string
    version = string
  }))
  default = {}
}

variable "min_instances" {
  description = "Minimum instances."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances."
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU limit."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory limit."
  type        = string
  default     = "512Mi"
}

variable "allow_unauthenticated" {
  description = "Grant allUsers invoker role."
  type        = bool
  default     = false
}
