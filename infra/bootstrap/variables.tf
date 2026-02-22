variable "project_id" {
  description = "GCP project ID to create the state backend in."
  type        = string
}

variable "location" {
  description = "Location for the GCS bucket and KMS resources."
  type        = string
  default     = "us-central1"
}

variable "bucket_name" {
  description = "Globally-unique GCS bucket name to store Terraform state."
  type        = string
}

variable "key_ring_name" {
  description = "KMS key ring name for Terraform state encryption."
  type        = string
  default     = "tf-state"
}

variable "crypto_key_name" {
  description = "KMS crypto key name for Terraform state encryption."
  type        = string
  default     = "tf-state"
}

variable "kms_crypto_key_id" {
  description = "Existing KMS crypto key id to use for bucket default encryption. If set, no KMS resources are created."
  type        = string
  default     = null
}
