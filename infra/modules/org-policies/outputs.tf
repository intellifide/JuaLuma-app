output "policy_ids" {
  description = "Policy resource IDs."
  value       = [for policy in google_project_organization_policy.boolean : policy.id]
}
