output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "application_url" {
  description = "Primary application URL."
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.app.dns_name}"
}

output "cloudfront_assets_url" {
  description = "CloudFront URL for static assets."
  value       = "https://${aws_cloudfront_distribution.assets.domain_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for application images."
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.app.name
}

output "ecs_task_definition_arn" {
  description = "ECS task definition ARN."
  value       = aws_ecs_task_definition.app.arn
}

output "ecs_security_group_id" {
  description = "Security group used by ECS tasks."
  value       = aws_security_group.ecs.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by ECS tasks."
  value       = aws_subnet.private[*].id
}

output "secrets_manager_secret_arn" {
  description = "Secrets Manager secret ARN used by the ECS task."
  value       = aws_secretsmanager_secret.app.arn
}
