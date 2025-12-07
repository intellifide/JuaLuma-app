# Network Module

Creates VPC, subnets, and baseline firewall rules.

**Source:** `terraform-google-network` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID
- `network_name` - VPC network name
- `subnets` - List of subnets with name, ip_cidr_range, region
- `firewall_rules` - Baseline firewall rules (default deny, allow LB/SVPC/PSC)

**Outputs:**
- `network_name` - VPC network name
- `network_self_link` - VPC network self link
- `subnet_self_links` - Map of subnet names to self links
