# Artifact Registry (Terraform)

This module manages a single Artifact Registry repository.

Notes:
- If the repository already exists in GCP (likely in `jualuma-dev`), you must `terraform import` it before the first apply.
- Vulnerability scanning is configured at the platform level and/or repo level depending on the Artifact Registry feature set and provider support. Treat this module as the source of truth for the repository itself; enable/verify scanning in GCP first, then codify if/when the provider exposes stable fields.

## Import example

```bash
terraform import module.artifact_registry.google_artifact_registry_repository.repo projects/<PROJECT_ID>/locations/<LOCATION>/repositories/<REPOSITORY_ID>
```
