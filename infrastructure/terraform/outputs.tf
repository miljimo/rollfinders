output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = module.alb.dns_name
}

output "target_group_arn" {
  description = "Application Load Balancer target group ARN."
  value       = module.alb.target_group_arn
}

output "rds_instance_identifier" {
  description = "RDS PostgreSQL instance identifier."
  value       = module.database.identifier
}

output "application_url" {
  description = "Primary application URL."
  value       = local.app_base_url
}

output "frontend_url" {
  description = "Frontend URL."
  value       = local.app_base_url
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
  value       = var.enable_custom_domain ? "https://${local.api_domain}" : ""
}

output "certificate_arn" {
  description = "ACM certificate ARN."
  value       = try(module.certificate[0].certificate_arn, null)
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

output "ec2_app_instance_id" {
  description = "EC2 app host instance ID when enabled."
  value       = try(module.ec2_app_host[0].instance_id, "")
}

output "ec2_app_private_ip" {
  description = "EC2 app host private IP when enabled."
  value       = try(module.ec2_app_host[0].private_ip, "")
}

output "private_subnet_ids" {
  description = "Private subnet IDs for the deployment VPC."
  value       = module.networking.private_subnet_ids
}

output "app_ssm_parameter_arns" {
  description = "SSM parameter ARNs used by the application stack."
  value       = module.app_secrets.arns
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
