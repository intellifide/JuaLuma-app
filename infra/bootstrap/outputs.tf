output "bucket_name" {
  value       = google_storage_bucket.tf_state.name
  description = "GCS bucket name for Terraform state."
}

output "kms_crypto_key_id" {
  value       = local.bucket_kms_key_id
  description = "KMS crypto key id used to encrypt Terraform state objects."
}
