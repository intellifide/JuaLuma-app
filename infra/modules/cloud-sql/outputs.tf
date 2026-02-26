output "instance_name" {
  description = "Cloud SQL instance name."
  value       = google_sql_database_instance.this.name
}

output "instance_connection_name" {
  description = "Cloud SQL connection name."
  value       = google_sql_database_instance.this.connection_name
}

output "private_ip_address" {
  description = "Private IP address, if configured."
  value       = google_sql_database_instance.this.private_ip_address
}
