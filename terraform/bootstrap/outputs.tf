output "state_buckets" {
  description = "Terraform state bucket names by environment."
  value       = { for env, bucket in module.state_bucket : env => bucket.name }
}
