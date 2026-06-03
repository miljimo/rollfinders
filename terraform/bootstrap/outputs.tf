output "state_buckets" {
  description = "Terraform state bucket names by environment."
  value       = { for env, bucket in module.state_bucket : env => bucket.name }
}

output "lock_tables" {
  description = "Terraform lock table names by environment."
  value       = { for env, table in aws_dynamodb_table.locks : env => table.name }
}
