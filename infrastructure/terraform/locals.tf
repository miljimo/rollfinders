locals {
  name_prefix      = "${var.project_name}-${var.environment_name}"
  is_production    = var.environment_name == "production"
  canonical_domain = var.domain_name
  www_domain       = local.is_production ? "www.${var.hosted_zone_name}" : ""
  api_domain       = local.is_production ? "api.${var.hosted_zone_name}" : "api.${var.domain_name}"
  app_base_url     = var.enable_custom_domain ? "https://${local.canonical_domain}" : "http://${module.alb.dns_name}"
  api_base_url     = var.enable_custom_domain ? "https://${local.api_domain}" : "http://${module.alb.dns_name}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment_name
    ManagedBy   = "terraform"
  }
}
