output "arn" {
  description = "Secrets Manager secret ARN."
  value       = aws_secretsmanager_secret.app.arn
}

output "id" {
  description = "Secrets Manager secret ID."
  value       = aws_secretsmanager_secret.app.id
}
