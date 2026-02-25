resource "google_project_organization_policy" "boolean" {
  for_each = var.boolean_constraints

  project    = var.project_id
  constraint = each.key

  boolean_policy {
    enforced = each.value
  }
}
