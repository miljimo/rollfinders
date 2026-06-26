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

module "ecs_security_group" {
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-ecs"
  description      = "Allow ALB traffic to the RollFinders frontend ECS task"
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
      description = "Outbound traffic for public APIs, email, and API gateway access"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

module "api_ecs_security_group" {
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-api-ecs"
  description      = "Allow RollFinders frontend traffic to the API service"
  vpc_id           = module.networking.vpc_id
  inbound_rules = [
    {
      from            = 8080
      to              = 8080
      protocol        = "tcp"
      description     = "API traffic from RollFinders frontend"
      security_groups = [module.ecs_security_group.id]
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      description = "API outbound traffic to domain services, database, and public providers"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

module "domain_service_security_group" {
  source           = "./modules/security_groups"
  environment_name = var.environment_name
  name             = "${var.project_name}-domain-services"
  description      = "Allow only the API service to reach lower RollFinders domain services"
  vpc_id           = module.networking.vpc_id
  inbound_rules = [
    {
      from            = 8080
      to              = 8080
      protocol        = "tcp"
      description     = "Domain service traffic from API service only"
      security_groups = [module.api_ecs_security_group.id]
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      description = "Domain service outbound traffic to database and external providers"
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
      from        = 5432
      to          = 5432
      protocol    = "tcp"
      description = "PostgreSQL from RollFinders ECS tiers"
      security_groups = [
        module.ecs_security_group.id,
        module.api_ecs_security_group.id,
        module.domain_service_security_group.id
      ]
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
  source             = "./modules/rds_postgres"
  name_prefix        = local.name_prefix
  subnet_ids         = module.networking.database_subnet_ids
  security_group_ids = [module.database_security_group.id]
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = random_password.db.result
  db_instance_class  = var.db_instance_class
  is_production      = local.is_production
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

module "task_role" {
  source      = "./modules/roles"
  environment = var.environment_name
  name        = "${var.project_name}-task"

  assume_role_principals = [
    {
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  ]
}

module "app_service" {
  source                = "./modules/ecs"
  environment           = var.environment_name
  name                  = var.project_name
  cluster_name          = local.name_prefix
  task_family           = local.name_prefix
  log_group_name        = "/ecs/${local.name_prefix}"
  service_name          = "web"
  launch_type           = "FARGATE"
  cpu                   = 2048
  memory                = 4096
  log_retention_in_days = local.is_production ? 30 : 14
  desired_count         = var.desired_count
  assign_public_ip      = !var.enable_nat_gateway
  subnets               = var.enable_nat_gateway ? module.networking.private_subnet_ids : module.networking.public_subnet_ids
  security_groups       = [module.ecs_security_group.id]
  task_role_arn         = module.task_role.arn

  execution_role_secret_arns = []

  execution_role_parameter_arns = concat(
    module.app_secrets.arns,
    [for parameter in aws_ssm_parameter.super_admin : parameter.arn]
  )

  load_balancer = {
    target_group_arn = module.alb.target_group_arn
    container_name   = "web"
    container_port   = 3000
  }

  task_definitions = [
    {
      name       = "web"
      image      = var.image_uri
      cpu        = var.container_cpu
      memory     = var.container_memory
      essential  = true
      log_region = var.aws_region
      environments = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "HOSTNAME", value = "0.0.0.0" },
        { name = "API_PUBLIC_BASE_URL", value = "http://127.0.0.1:8080" },
        { name = "EMAIL_DOMAIN", value = module.email.sending_domain }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "NEXTAUTH_SECRET", valueFrom = module.app_secrets.arn_by_key["NEXTAUTH_SECRET"] },
        { name = "NEXTAUTH_URL", valueFrom = module.app_secrets.arn_by_key["NEXTAUTH_URL"] },
        { name = "EMAIL_FROM", valueFrom = module.app_secrets.arn_by_key["EMAIL_FROM"] },
        { name = "EMAIL_REPLY_TO", valueFrom = module.app_secrets.arn_by_key["EMAIL_REPLY_TO"] },
        { name = "SMTP_HOST", valueFrom = module.app_secrets.arn_by_key["SMTP_HOST"] },
        { name = "SMTP_PORT", valueFrom = module.app_secrets.arn_by_key["SMTP_PORT"] },
        { name = "SMTP_USERNAME", valueFrom = module.app_secrets.arn_by_key["SMTP_USERNAME"] },
        { name = "SMTP_PASSWORD", valueFrom = module.app_secrets.arn_by_key["SMTP_PASSWORD"] },
        { name = "MAILBOX_LINK", valueFrom = module.app_secrets.arn_by_key["MAILBOX_LINK"] },
        { name = "CRON_SECRET", valueFrom = module.app_secrets.arn_by_key["CRON_SECRET"] },
        { name = "NOTIFICATION_API_KEY", valueFrom = module.app_secrets.arn_by_key["USER_SERVICE_API_KEY"] },
        { name = "SUPER_ADMIN_EMAIL", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_EMAIL"].arn },
        { name = "SUPER_ADMIN_PASSWORD", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_PASSWORD"].arn },
        { name = "SUPER_ADMIN_NAME", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_NAME"].arn }
      ]
      ports = [
        {
          container_port = 3000
          host_port      = 3000
          protocol       = "tcp"
        }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -fsS http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    },
    {
      name       = "api"
      image      = var.api_service_image_uri
      cpu        = 64
      memory     = 128
      essential  = false
      log_region = var.aws_region
      environments = [
        { name = "PORT", value = "8080" },
        { name = "USER_PUBLIC_BASE_URL", value = "http://127.0.0.1:8081" },
        { name = "AUTHORISATION_PUBLIC_BASE_URL", value = "http://127.0.0.1:8082" },
        { name = "ACADEMY_PUBLIC_BASE_URL", value = "http://127.0.0.1:8083" },
        { name = "ORGANISATION_PUBLIC_BASE_URL", value = "http://127.0.0.1:8084" },
        { name = "COURSE_PUBLIC_BASE_URL", value = "http://127.0.0.1:8085" },
        { name = "BOOKING_PUBLIC_BASE_URL", value = "http://127.0.0.1:8086" },
        { name = "PAYMENT_PUBLIC_BASE_URL", value = "http://127.0.0.1:8087" },
        { name = "SUBSCRIPTION_PUBLIC_BASE_URL", value = "http://127.0.0.1:8090" },
        { name = "LEGACY_NEXT_PUBLIC_BASE_URL", value = "http://127.0.0.1:3000" },
        { name = "ROLLFINDERS_APPLICATION_ID", value = "app_rollfinders" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] }
      ]
      ports       = [{ container_port = 8080, host_port = 8080, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8080/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name       = "users"
      image      = var.user_service_image_uri
      cpu        = 64
      memory     = 128
      essential  = false
      log_region = var.aws_region
      environments = [
        { name = "PORT", value = "8081" },
        { name = "AUTHORISATION_CUTOVER", value = "true" },
        { name = "DEFAULT_USER_ROLE", value = "STANDARD_USER" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] },
        { name = "SUPER_ADMIN_EMAIL", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_EMAIL"].arn },
        { name = "SUPER_ADMIN_PASSWORD", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_PASSWORD"].arn },
        { name = "SUPER_ADMIN_NAME", valueFrom = aws_ssm_parameter.super_admin["SUPER_ADMIN_NAME"].arn }
      ]
      ports       = [{ container_port = 8081, host_port = 8081, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8081/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name         = "authorisation"
      image        = var.authorisation_service_image_uri
      cpu          = 64
      memory       = 128
      essential    = false
      log_region   = var.aws_region
      environments = [{ name = "PORT", value = "8082" }]
      secrets      = [{ name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] }]
      ports        = [{ container_port = 8082, host_port = 8082, protocol = "tcp" }]
      healthCheck  = { command = ["CMD-SHELL", "wget -qO- http://localhost:8082/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name         = "academy"
      image        = var.academy_service_image_uri
      cpu          = 64
      memory       = 128
      essential    = false
      log_region   = var.aws_region
      environments = [{ name = "PORT", value = "8083" }]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] }
      ]
      ports       = [{ container_port = 8083, host_port = 8083, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8083/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name         = "organisation"
      image        = var.organisation_service_image_uri
      cpu          = 64
      memory       = 128
      essential    = false
      log_region   = var.aws_region
      environments = [{ name = "PORT", value = "8084" }]
      secrets      = [{ name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] }]
      ports        = [{ container_port = 8084, host_port = 8084, protocol = "tcp" }]
      healthCheck  = { command = ["CMD-SHELL", "wget -qO- http://localhost:8084/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name         = "courses"
      image        = var.course_service_image_uri
      cpu          = 64
      memory       = 128
      essential    = false
      log_region   = var.aws_region
      environments = [{ name = "PORT", value = "8085" }]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] }
      ]
      ports       = [{ container_port = 8085, host_port = 8085, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8085/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name         = "booking"
      image        = var.booking_service_image_uri
      cpu          = 64
      memory       = 128
      essential    = false
      log_region   = var.aws_region
      environments = [{ name = "PORT", value = "8086" }]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] }
      ]
      ports       = [{ container_port = 8086, host_port = 8086, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8086/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name       = "payments"
      image      = var.payment_service_image_uri
      cpu        = 64
      memory     = 128
      essential  = false
      log_region = var.aws_region
      environments = [
        { name = "PORT", value = "8087" },
        { name = "PAYMENT_PUBLIC_BASE_URL", value = "http://127.0.0.1:8080" },
        { name = "PAYMENT_DEFAULT_CLIENT_ID", value = "rollfinders" },
        { name = "PAYMENT_DEFAULT_CLIENT_NAME", value = "Rollfinders" },
        { name = "PAYMENT_DEFAULT_CLIENT_CALLBACK_URL", value = "${local.app_base_url}/payments/status" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] },
        { name = "PAYMENT_GATEWAY_API_KEY", valueFrom = module.app_secrets.arn_by_key["PAYMENT_GATEWAY_API_KEY"] },
        { name = "STRIPE_API_VERSION", valueFrom = module.app_secrets.arn_by_key["STRIPE_API_VERSION"] },
        { name = "STRIPE_CONTEXT", valueFrom = module.app_secrets.arn_by_key["STRIPE_CONTEXT"] }
      ]
      ports       = [{ container_port = 8087, host_port = 8087, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8087/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    },
    {
      name       = "subscriptions"
      image      = var.subscription_service_image_uri
      cpu        = 64
      memory     = 128
      essential  = false
      log_region = var.aws_region
      environments = [
        { name = "PORT", value = "8090" },
        { name = "PAYMENT_PUBLIC_BASE_URL", value = "http://127.0.0.1:8087" },
        { name = "PAYMENT_DEFAULT_CLIENT_CALLBACK_URL", value = "${local.app_base_url}/dashboard/subscriptions" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.app_secrets.arn_by_key["DATABASE_URL"] },
        { name = "DB_HOST", valueFrom = module.app_secrets.arn_by_key["DB_HOST"] },
        { name = "DB_PORT", valueFrom = module.app_secrets.arn_by_key["DB_PORT"] },
        { name = "DB_USER", valueFrom = module.app_secrets.arn_by_key["DB_USER"] },
        { name = "DB_PASSWORD", valueFrom = module.app_secrets.arn_by_key["DB_PASSWORD"] },
        { name = "DB_NAME", valueFrom = module.app_secrets.arn_by_key["DB_NAME"] }
      ]
      ports       = [{ container_port = 8090, host_port = 8090, protocol = "tcp" }]
      healthCheck = { command = ["CMD-SHELL", "wget -qO- http://localhost:8090/healthz || exit 1"], interval = 30, timeout = 5, retries = 3, startPeriod = 30 }
    }
  ]

  depends_on = [
    module.alb
  ]
}

module "ecs_autoscaling" {
  source       = "./modules/ecs_autoscaling"
  name_prefix  = local.name_prefix
  cluster_name = module.app_service.cluster_name
  service_name = module.app_service.service_name
  min_capacity = var.desired_count
  max_capacity = local.is_production ? 6 : 2
  depends_on   = [module.app_service]
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
