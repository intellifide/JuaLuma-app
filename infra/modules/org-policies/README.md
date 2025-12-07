# Organization Policies Module

Creates organization policies to enforce security guardrails.

**Source:** `terraform-google-org-policy` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID (or org_id/folder_id)
- `constraints` - List of policy constraints:
  - `compute.disableExternalIpAddress` - Disable external IPs on VMs
  - `iam.disableServiceAccountKeyCreation` - Disable SA key creation
  - `gcp.restrictCmekCryptoKeyProjects` - Restrict CMEK projects

**Outputs:**
- `policy_ids` - List of policy IDs
