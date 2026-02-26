output "sink_id" {
  description = "Sink ID."
  value       = google_logging_project_sink.this.id
}

output "writer_identity" {
  description = "Sink writer identity."
  value       = google_logging_project_sink.this.writer_identity
}
