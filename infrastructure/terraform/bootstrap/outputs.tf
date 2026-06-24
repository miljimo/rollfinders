output "terraform_artefact_bucket" {
  description = "Shared Terraform artefact bucket name."
  value       = module.terraform_artefact_bucket.name
}

output "state_keys" {
  description = "Terraform state keys by environment inside the shared artefact bucket."
  value       = { for env in var.environments : env => "${env}/terraform.tfstate" }
}
