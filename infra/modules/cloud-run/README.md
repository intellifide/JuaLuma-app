# Cloud Run Module

Creates Cloud Run service with authenticated ingress and VPC connector.

**Source:** `terraform-google-cloud-run` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID
- `name` - Cloud Run service name
- `location` - GCP region
- `image` - Container image URL
- `ingress` - Ingress setting (must be "internal-and-cloud-load-balancing")
- `service_account` - Service account email
- `vpc_connector` - Serverless VPC Connector name
- `egress` - Egress setting (must be "private-ranges-only")
- `env` - Environment variables
- `max_instances` - Maximum instances
- `min_instances` - Minimum instances (0 for scale-to-zero)

**Outputs:**
- `service_name` - Cloud Run service name
- `service_url` - Service URL
- `service_id` - Service ID
