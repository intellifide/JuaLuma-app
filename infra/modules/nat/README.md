# Cloud NAT Module

Creates Cloud NAT for controlled egress with logging.

**Source:** `terraform-google-cloud-nat` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID
- `region` - GCP region
- `router_name` - Cloud Router name
- `nat_name` - Cloud NAT name
- `network` - VPC network name or self link
- `nat_ips` - NAT IP addresses (auto-allocate if empty)

**Outputs:**
- `router_name` - Cloud Router name
- `nat_name` - Cloud NAT name

**Last Updated:** December 07, 2025 at 08:39 PM
