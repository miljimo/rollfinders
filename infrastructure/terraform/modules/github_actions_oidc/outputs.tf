output "role_arn" {
  description = "IAM role ARN used by GitHub Actions."
  value       = aws_iam_role.github_actions.arn
}

output "provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.github.arn
}
