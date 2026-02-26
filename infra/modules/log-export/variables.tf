variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "sink_name" {
  description = "Log sink name."
  type        = string
}

variable "destination" {
  description = "Sink destination (GCS/BQ/PubSub)."
  type        = string
}

variable "filter" {
  description = "Logging filter for sink."
  type        = string
  default     = ""
}

variable "unique_writer_identity" {
  description = "Create a unique service account writer identity."
  type        = bool
  default     = true
}
