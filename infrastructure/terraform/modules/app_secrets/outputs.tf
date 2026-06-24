output "arns" {
  description = "SSM parameter ARNs."
  value       = [for parameter in aws_ssm_parameter.app : parameter.arn]
}

output "arn_by_key" {
  description = "SSM parameter ARN by application configuration key."
  value       = { for key, parameter in aws_ssm_parameter.app : key => parameter.arn }
}

output "names" {
  description = "SSM parameter names."
  value       = [for parameter in aws_ssm_parameter.app : parameter.name]
}
