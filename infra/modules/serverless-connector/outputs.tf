output "connector_name" {
  description = "Connector name."
  value       = google_vpc_access_connector.this.name
}

output "connector_id" {
  description = "Connector ID."
  value       = google_vpc_access_connector.this.id
}
