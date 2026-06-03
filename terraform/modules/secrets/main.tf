resource "aws_secretsmanager_secret" "app" {
  name = var.name
}

output "secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}
