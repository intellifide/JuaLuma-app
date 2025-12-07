# HTTPS Load Balancer Module

Creates Global HTTPS Load Balancer with Cloud Armor WAF, CDN, and serverless NEG backend.

**Source:** `terraform-google-lb-http` (CFT) + `terraform-google-cloud-armor` (CFT)

**Inputs:**
- `project_id` - GCP project ID
- `name` - Load balancer name
- `ssl` - Enable SSL (true)
- `managed_ssl_certificate_domains` - Domains for managed SSL cert
- `backends` - Backend configuration with backend_type="SERVERLESS_NEGO" referencing Cloud Run service
- `cloud_armor_policy` - Cloud Armor security policy name
- `enable_cdn` - Enable Cloud CDN (true)
- `log_config` - Logging configuration

**Outputs:**
- `lb_ip_address` - Load balancer IP address
- `lb_url` - Load balancer URL
