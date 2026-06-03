output "state_buckets" {
  description = "Terraform state bucket names by environment."
  value       = { for env, bucket in aws_s3_bucket.state : env => bucket.bucket }
}

output "lock_tables" {
  description = "Terraform lock table names by environment."
  value       = { for env, table in aws_dynamodb_table.locks : env => table.name }
}
