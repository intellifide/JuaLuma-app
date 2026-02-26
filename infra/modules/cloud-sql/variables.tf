variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "name" {
  description = "Cloud SQL instance name."
  type        = string
}

variable "region" {
  description = "Cloud SQL region."
  type        = string
}

variable "database_version" {
  description = "Database version (e.g., POSTGRES_15)."
  type        = string
  default     = "POSTGRES_15"
}

variable "tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-8192"
}

variable "availability_type" {
  description = "Availability type (ZONAL or REGIONAL)."
  type        = string
  default     = "REGIONAL"
}

variable "disk_size_gb" {
  description = "Initial disk size in GB."
  type        = number
  default     = 20
}

variable "disk_autoresize" {
  description = "Enable disk autoresize."
  type        = bool
  default     = true
}

variable "private_network" {
  description = "VPC self link for private IP; when null, public IPv4 is enabled."
  type        = string
  default     = null
}

variable "deletion_protection" {
  description = "Enable deletion protection."
  type        = bool
  default     = true
}

variable "backup_enabled" {
  description = "Enable automated backups."
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Backup start time in UTC HH:MM format."
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery."
  type        = bool
  default     = true
}
