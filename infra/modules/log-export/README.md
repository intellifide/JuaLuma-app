# Log Export Module

Creates log export sinks for LB, Armor, NAT, DNS, and audit logs.

**Source:** `terraform-google-log-export` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID (or org_id/folder_id)
- `sink_name` - Log sink name
- `destination` - Destination (GCS bucket, BigQuery dataset, Pub/Sub topic)
- `filter` - Log filter (e.g., resource.type="http_load_balancer")

**Outputs:**
- `sink_id` - Log sink ID
- `writer_identity` - Service account used for writing logs

**Last Updated:** December 07, 2025 at 08:39 PM
