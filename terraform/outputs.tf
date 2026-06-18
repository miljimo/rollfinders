output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = module.alb.dns_name
}

output "rds_instance_identifier" {
  description = "RDS PostgreSQL instance identifier."
  value       = module.database.identifier
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
  value       = module.certificate.certificate_arn
}

output "hosted_zone_id" {
  description = "Discovered Route53 hosted zone ID."
  value       = data.aws_route53_zone.public.zone_id
}

output "cloudfront_assets_url" {
  description = "CloudFront URL for static assets."
  value       = "https://${module.assets_cdn.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for static assets."
  value       = module.assets_cdn.distribution_id
}

output "ecr_repository_url" {
  description = "ECR repository URL for application images."
  value       = module.ecr.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = module.app_service.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = module.app_service.service_name
}

output "ecs_task_definition_arn" {
  description = "ECS task definition ARN."
  value       = module.app_service.task_definition_arn
}

output "ecs_security_group_id" {
  description = "Security group used by ECS tasks."
  value       = module.ecs_security_group.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by ECS tasks."
  value       = module.networking.private_subnet_ids
}

output "secrets_manager_secret_arn" {
  description = "Secrets Manager secret ARN used by the ECS task."
  value       = module.app_secrets.arn
}

output "email_sending_domain" {
  description = "RollFinders email sending domain."
  value       = module.email.sending_domain
}

output "email_from_address" {
  description = "Default backend sender address."
  value       = var.email_from_address != "" ? var.email_from_address : "support@${module.email.sending_domain}"
}

output "email_smtp_host" {
  description = "SMTP host configured for backend applications."
  value       = module.email.smtp_host
}

output "email_mailbox_link" {
  description = "Mailbox link exposed to backend/admin users."
  value       = "https://${module.email.mailbox_domain}"
}
