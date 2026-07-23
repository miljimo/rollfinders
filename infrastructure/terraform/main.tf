data "aws_caller_identity" "current" {}

data "aws_route53_zone" "public" {
  name         = var.hosted_zone_name
  private_zone = false
}

module "networking" {
  source             = "./modules/networking"
  environment_name   = var.environment_name
  name_prefix        = local.name_prefix
  vpc_cidr_block     = var.vpc_cidr_block
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
}

module "alb_security_group" {
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-alb"
  description      = "Allow public web traffic to the RollFinders ALB"
  vpc_id           = module.networking.vpc_id
  inbound_rules = [
    {
      from        = 80
      to          = 80
      protocol    = "tcp"
      description = "HTTP"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      from        = 443
      to          = 443
      protocol    = "tcp"
      description = "HTTPS"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      description = "All outbound traffic"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

module "ec2_app_security_group" {
  count            = 1
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-ec2-app"
  description      = "Allow ALB traffic to the RollFinders EC2 app host"
  vpc_id           = module.networking.vpc_id
  inbound_rules = [
    {
      from            = 3000
      to              = 3000
      protocol        = "tcp"
      description     = "App traffic from ALB"
      security_groups = [module.alb_security_group.id]
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      description = "Outbound traffic for image pulls, database, email, and public APIs"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

module "database_security_group" {
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-database"
  description      = "Allow ECS tasks to connect to PostgreSQL"
  vpc_id           = module.networking.vpc_id
  inbound_rules = [
    {
      from            = 5432
      to              = 5432
      protocol        = "tcp"
      description     = "PostgreSQL from RollFinders ECS tiers"
      security_groups = [module.ec2_app_security_group[0].id]
    }
  ]
}

module "certificate" {
  count                     = var.enable_custom_domain ? 1 : 0
  source                    = "./modules/acm_dns_certificate"
  canonical_domain          = local.canonical_domain
  subject_alternative_names = local.is_production ? ["*.${var.hosted_zone_name}"] : ["*.${local.canonical_domain}"]
  zone_id                   = data.aws_route53_zone.public.zone_id
}

module "alb" {
  source             = "./modules/alb_app"
  name_prefix        = local.name_prefix
  vpc_id             = module.networking.vpc_id
  security_group_ids = [module.alb_security_group.id]
  subnet_ids         = module.networking.public_subnet_ids
  certificate_arn    = var.enable_custom_domain ? module.certificate[0].certificate_arn : null
  enable_https       = var.enable_custom_domain
  canonical_domain   = local.canonical_domain
  www_domain         = local.www_domain
}

module "ecr" {
  source = "./modules/ecr_repository"
  name   = "${var.project_name}/${var.environment_name}/app"
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "random_password" "nextauth" {
  length  = 48
  special = false
}

resource "random_password" "cron" {
  length  = 48
  special = false
}

resource "random_password" "user_service_api_key" {
  length  = 48
  special = false
}

resource "random_password" "user_service_jwt" {
  length  = 48
  special = false
}

resource "random_password" "payment_service_api_key" {
  length  = 48
  special = false
}

module "database" {
  source                  = "./modules/rds_postgres"
  name_prefix             = local.name_prefix
  subnet_ids              = module.networking.database_subnet_ids
  security_group_ids      = [module.database_security_group.id]
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = random_password.db.result
  db_instance_class       = var.db_instance_class
  backup_retention_period = var.db_backup_retention_period
  multi_az                = var.db_multi_az
  is_production           = local.is_production
}

module "email" {
  source                      = "./modules/smtp_email_dns"
  domain_name                 = var.hosted_zone_name
  zone_id                     = data.aws_route53_zone.public.zone_id
  dmarc_rua_email             = "postmaster@${var.hosted_zone_name}"
  privateemail_dkim_txt_value = var.privateemail_dkim_txt_value
}

module "app_secrets" {
  source = "./modules/app_secrets"
  name   = "${local.name_prefix}/app"
  tags   = local.common_tags

  secret_values = {
    NEXTAUTH_SECRET         = var.nextauth_secret != "" ? var.nextauth_secret : random_password.nextauth.result
    NEXTAUTH_URL            = local.app_base_url
    DATABASE_URL            = "postgresql://${var.db_username}:${random_password.db.result}@${module.database.address}:5432/${var.db_name}?sslmode=require"
    DB_HOST                 = module.database.address
    DB_PORT                 = "5432"
    DB_USER                 = var.db_username
    DB_PASSWORD             = random_password.db.result
    DB_NAME                 = var.db_name
    GOOGLE_MAPS_API_KEY     = var.google_maps_api_key != "" ? var.google_maps_api_key : "__UNSET__"
    EMAIL_FROM              = var.email_from_address != "" ? var.email_from_address : "support@${module.email.sending_domain}"
    EMAIL_REPLY_TO          = var.email_reply_to_address != "" ? var.email_reply_to_address : "support@${module.email.sending_domain}"
    SMTP_HOST               = var.smtp_host != "" ? var.smtp_host : module.email.smtp_host
    SMTP_PORT               = var.smtp_port
    SMTP_USERNAME           = var.smtp_username != "" ? var.smtp_username : "__UNSET__"
    SMTP_PASSWORD           = var.smtp_password != "" ? var.smtp_password : "__UNSET__"
    MAILBOX_LINK            = "https://${module.email.mailbox_domain}"
    CRON_SECRET             = random_password.cron.result
    USER_SERVICE_API_KEY    = random_password.user_service_api_key.result
    USER_SERVICE_JWT_SECRET = random_password.user_service_jwt.result
    PAYMENT_SERVICE_API_KEY = random_password.payment_service_api_key.result
    PAYMENT_GATEWAY_API_KEY = var.payment_gateway_api_key != "" ? var.payment_gateway_api_key : "__UNSET__"
    STRIPE_API_VERSION      = var.stripe_api_version
    STRIPE_CONTEXT          = var.stripe_context != "" ? var.stripe_context : "__UNSET__"
  }

  secure_value_keys = [
    "NEXTAUTH_SECRET",
    "DATABASE_URL",
    "DB_PASSWORD",
    "GOOGLE_MAPS_API_KEY",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "CRON_SECRET",
    "USER_SERVICE_API_KEY",
    "USER_SERVICE_JWT_SECRET",
    "PAYMENT_SERVICE_API_KEY",
    "PAYMENT_GATEWAY_API_KEY",
    "STRIPE_CONTEXT"
  ]
}

resource "aws_ssm_parameter" "super_admin" {
  for_each = {
    SUPER_ADMIN_EMAIL    = var.super_admin_email
    SUPER_ADMIN_PASSWORD = var.super_admin_password
    SUPER_ADMIN_NAME     = var.super_admin_name
  }

  name  = "/${local.name_prefix}/super-admin/${each.key}"
  type  = "SecureString"
  value = each.value
  tags  = local.common_tags
}

module "ec2_app_host" {
  count              = 1
  source             = "./modules/ec2_app_host"
  name_prefix        = local.name_prefix
  subnet_id          = module.networking.public_subnet_ids[0]
  security_group_ids = [module.ec2_app_security_group[0].id]
  instance_type      = var.ec2_app_instance_type
  root_volume_size   = var.ec2_app_root_volume_size
  ssm_parameter_arns = concat(module.app_secrets.arns, [for parameter in aws_ssm_parameter.super_admin : parameter.arn])
  tags               = local.common_tags
  depends_on         = [module.app_secrets]
}

resource "aws_lb_target_group_attachment" "ec2_app_host" {
  count            = 1
  target_group_arn = module.alb.target_group_arn
  target_id        = module.ec2_app_host[0].private_ip
  port             = 3000
}

module "assets_bucket" {
  source             = "./modules/s3"
  environment_name   = var.environment_name
  name               = "assets"
  enabled_versioning = true
  force_deletion     = !local.is_production
  acl                = "private"
  use_actual_name    = false
  sse_algorithm      = "AES256"
}

module "events" {
  source           = "./modules/event_bridge"
  environment_name = var.environment_name
  name             = "events"
}

module "assets_cdn" {
  source                      = "./modules/cloudfront_s3_assets"
  name_prefix                 = local.name_prefix
  bucket_regional_domain_name = module.assets_bucket.bucket_regional_domain_name
}

module "app_dns_records" {
  count            = var.enable_custom_domain ? 1 : 0
  source           = "./modules/route53_app_records"
  zone_id          = data.aws_route53_zone.public.zone_id
  canonical_domain = local.canonical_domain
  www_domain       = local.www_domain
  api_domain       = local.api_domain
  alb_dns_name     = module.alb.dns_name
  alb_zone_id      = module.alb.zone_id
}
