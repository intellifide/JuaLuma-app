resource "google_artifact_registry_repository" "repo" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_id
  description   = var.description
  format        = "DOCKER"

  lifecycle {
    # Avoid noisy diffs for description text. This module's primary purpose is
    # to codify repository existence and identifiers.
    ignore_changes = [description]
  }

  dynamic "docker_config" {
    for_each = var.immutable_tags ? [1] : []
    content {
      immutable_tags = true
    }
  }
}
