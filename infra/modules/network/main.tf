resource "google_compute_network" "this" {
  project                         = var.project_id
  name                            = var.network_name
  auto_create_subnetworks         = var.auto_create_subnetworks
  routing_mode                    = var.routing_mode
  delete_default_routes_on_create = var.delete_default_routes_on_create
}

resource "google_compute_subnetwork" "this" {
  for_each = {
    for subnet in var.subnets : subnet.name => subnet
  }

  project                  = var.project_id
  name                     = each.value.name
  region                   = each.value.region
  network                  = google_compute_network.this.id
  ip_cidr_range            = each.value.ip_cidr_range
  private_ip_google_access = try(each.value.private_ip_google_access, true)
}
