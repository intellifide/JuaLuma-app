# Private Service Connect Module

Creates Private Service Connect endpoints for Google APIs and Cloud SQL.

**Source:** `cloud-foundation-fabric/modules/psc-google-apis` and `psc-cloud-sql`

**Inputs:**
- `project_id` - GCP project ID
- `region` - GCP region
- `network` - VPC network name or self link
- `subnet_self_link` - Subnet self link for PSC endpoint
- `psc_target_service` - Target service (googleapis, sql)

**Outputs:**
- `psc_endpoint_id` - PSC endpoint ID
- `psc_endpoint_ip` - PSC endpoint IP address

**Last Updated:** December 07, 2025 at 08:39 PM
