# Cloud SQL Module

Creates Cloud SQL instance with private IP, high availability, and backups.

**Source:** `terraform-google-sql-db` (Google Cloud Foundation Toolkit)

**Inputs:**
- `project_id` - GCP project ID
- `name` - Cloud SQL instance name
- `database_version` - PostgreSQL version (e.g., POSTGRES_15)
- `region` - GCP region
- `availability_type` - REGIONAL for HA
- `tier` - Machine type (e.g., db-custom-2-8)
- `disk_size` - Initial disk size in GB
- `disk_autoresize` - Enable automatic disk resizing
- `ip_configuration` - IP config with ipv4_enabled=false, private_network set
- `deletion_protection` - Enable deletion protection
- `backup_configuration` - Backup and PITR configuration

**Outputs:**
- `instance_name` - Cloud SQL instance name
- `instance_connection_name` - Connection name for applications
- `private_ip_address` - Private IP address
