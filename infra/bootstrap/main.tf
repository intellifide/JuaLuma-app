provider "google" {
  project = var.project_id
}

resource "google_kms_key_ring" "tf_state" {
  count    = var.kms_crypto_key_id == null ? 1 : 0
  name     = var.key_ring_name
  location = var.location
}

resource "google_kms_crypto_key" "tf_state" {
  count           = var.kms_crypto_key_id == null ? 1 : 0
  name            = var.crypto_key_name
  key_ring        = google_kms_key_ring.tf_state[0].id
  rotation_period = "2592000s" # 30 days

  lifecycle {
    prevent_destroy = true
  }
}

locals {
  bucket_kms_key_id = var.kms_crypto_key_id != null ? var.kms_crypto_key_id : google_kms_crypto_key.tf_state[0].id
}

resource "google_storage_bucket" "tf_state" {
  name                        = var.bucket_name
  location                    = var.location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = local.bucket_kms_key_id
  }

  lifecycle {
    prevent_destroy = true
  }
}
