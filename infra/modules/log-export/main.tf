resource "google_logging_project_sink" "this" {
  project                = var.project_id
  name                   = var.sink_name
  destination            = var.destination
  filter                 = var.filter
  unique_writer_identity = var.unique_writer_identity
}
