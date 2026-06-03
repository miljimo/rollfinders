output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "application_url" {
  description = "Primary application URL."
  value       = "https://${local.canonical_domain}"
}

output "frontend_url" {
  description = "Frontend URL."
  value       = "https://${local.canonical_domain}"
}

output "frontend_domain" {
  description = "Frontend domain."
  value       = local.canonical_domain
}

output "www_url" {
  description = "Production WWW URL. Empty outside production."
  value       = local.www_domain == "" ? "" : "https://${local.www_domain}"
}

output "api_url" {
  description = "Prepared API URL."
  value       = "https://${local.api_domain}"
}

output "certificate_arn" {
  description = "ACM certificate ARN."
  value       = aws_acm_certificate_validation.app.certificate_arn
}

output "hosted_zone_id" {
  description = "Discovered Route53 hosted zone ID."
  value       = data.aws_route53_zone.public.zone_id
}

output "cloudfront_assets_url" {
  description = "CloudFront URL for static assets."
  value       = "https://${aws_cloudfront_distribution.assets.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for static assets."
  value       = aws_cloudfront_distribution.assets.id
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
