output "repository_id" {
  value       = google_artifact_registry_repository.repo.repository_id
  description = "Artifact Registry repository id."
}

output "repository_resource_name" {
  value       = google_artifact_registry_repository.repo.name
  description = "Full repository resource name."
}

output "docker_registry_host" {
  value       = "${var.location}-docker.pkg.dev"
  description = "Docker registry hostname for this location."
}
