# Serverless VPC Connector Module

Creates Serverless VPC Connector for Cloud Run/Functions to access VPC resources.

**Source:** `terraform-google-vpc-serverless-connector` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID
- `region` - GCP region
- `name` - Connector name
- `network` - VPC network name or self link
- `ip_cidr_range` - CIDR range for connector (e.g., 10.8.0.0/28)

**Outputs:**
- `connector_name` - Connector name
- `connector_id` - Connector ID
