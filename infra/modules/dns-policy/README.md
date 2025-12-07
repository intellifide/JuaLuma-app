# DNS Policy Module

Creates DNS policy to force googleapis.com resolution to Private Service Connect endpoints.

**Source:** `cloud-foundation-fabric/modules/dns-policy` or `terraform-google-cloud-dns` samples

**Inputs:**
- `project_id` - GCP project ID
- `network` - VPC network name or self link
- `policy_name` - DNS policy name
- `alternative_name_server_config` - Name server config pointing to PSC

**Outputs:**
- `policy_id` - DNS policy ID
