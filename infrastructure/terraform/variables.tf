variable "project_name" {
  type        = string
  description = "Application name used for resource naming."
  default     = "rollfinder"
}

variable "environment_name" {
  type        = string
  description = "Deployment environment: dev or production."

  validation {
    condition     = contains(["dev", "production"], var.environment_name)
    error_message = "environment_name must be dev or production."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for all resources."
  default     = "eu-west-2"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones used for public, private, and database subnets."
  default     = ["eu-west-2a", "eu-west-2b"]
}

variable "vpc_cidr_block" {
  type        = string
  description = "CIDR block for the deployment VPC."
  default     = "10.40.0.0/16"
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Whether to provision NAT Gateway egress for private subnets."
  default     = true
}

variable "image_uri" {
  type        = string
  description = "Immutable ECR image URI pushed by the deployment pipeline."
}

variable "user_service_image_uri" {
  type        = string
  description = "Users service image URI."
  default     = ""
}

variable "api_service_image_uri" {
  type        = string
  description = "API Gateway service image URI."
  default     = ""
}

variable "authorisation_service_image_uri" {
  type        = string
  description = "Authorisation service image URI."
  default     = ""
}

variable "academy_service_image_uri" {
  type        = string
  description = "Academy service image URI."
  default     = ""
}

variable "organisation_service_image_uri" {
  type        = string
  description = "Organisation service image URI."
  default     = ""
}

variable "course_service_image_uri" {
  type        = string
  description = "Courses service image URI."
  default     = ""
}

variable "booking_service_image_uri" {
  type        = string
  description = "Booking service image URI."
  default     = ""
}

variable "payment_service_image_uri" {
  type        = string
  description = "Payments service image URI."
  default     = ""
}

variable "subscription_service_image_uri" {
  type        = string
  description = "Subscriptions service image URI."
  default     = ""
}

variable "notification_service_image_uri" {
  type        = string
  description = "Notification service image URI."
  default     = ""
}

variable "analytics_service_image_uri" {
  type        = string
  description = "Analytics service image URI."
  default     = ""
}

variable "access_key_service_image_uri" {
  type        = string
  description = "Access Keys service image URI."
  default     = ""
}

variable "wallet_service_image_uri" {
  type        = string
  description = "Wallet service image URI."
  default     = ""
}

variable "transfer_service_image_uri" {
  type        = string
  description = "Transfer service image URI."
  default     = ""
}

variable "pricing_service_image_uri" {
  type        = string
  description = "Pricing service image URI."
  default     = ""
}

variable "desired_count" {
  type        = number
  description = "Desired ECS task count."
  default     = 1
}

variable "container_cpu" {
  type        = number
  description = "Fargate task CPU units."
  default     = 512
}

variable "container_memory" {
  type        = number
  description = "Fargate task memory in MiB."
  default     = 1024
}

variable "domain_name" {
  type        = string
  description = "DNS name for the app, such as dev.rollfinders.com."
  default     = ""
}

variable "enable_custom_domain" {
  type        = bool
  description = "Whether to provision ACM, HTTPS listener, and Route53 app records for domain_name."
  default     = true
}

variable "hosted_zone_name" {
  type        = string
  description = "Existing Route53 hosted zone name to discover."
  default     = "rollfinders.com"
}

variable "db_name" {
  type        = string
  description = "RDS database name."
  default     = "rollfinder"
}

variable "db_username" {
  type        = string
  description = "RDS master username."
  default     = "rollfinder"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class."
  default     = "db.t4g.micro"
}

variable "nextauth_secret" {
  type        = string
  description = "NextAuth signing secret. If empty, Terraform generates one."
  sensitive   = true
  default     = ""
}

variable "google_maps_api_key" {
  type        = string
  description = "Google Maps API key injected into the web task from SSM at runtime."
  sensitive   = true
  default     = ""
}

variable "super_admin_email" {
  type        = string
  description = "Protected super admin email ensured after every environment deployment."
  default     = "admin@rollfinder.com"
}

variable "super_admin_password" {
  type        = string
  description = "Protected super admin password ensured after every environment deployment."
  sensitive   = true
  default     = "admin"
}

variable "super_admin_name" {
  type        = string
  description = "Protected super admin display name ensured after every environment deployment."
  default     = "RollFinder Admin"
}

variable "privateemail_dkim_txt_value" {
  type        = string
  description = "Provider-supplied PrivateEmail DKIM public TXT value for privateemail._domainkey.rollfinders.com. This is public DNS data, not a secret."
  default     = ""
}

variable "smtp_username" {
  type        = string
  description = "SMTP username for mailbox delivery."
  sensitive   = true
  default     = ""
}

variable "smtp_password" {
  type        = string
  description = "SMTP password for fallback mailbox delivery."
  sensitive   = true
  default     = ""
}

variable "smtp_host" {
  type        = string
  description = "SMTP host for mailbox delivery. Leave empty to use the managed SMTP alias."
  default     = ""
}

variable "smtp_port" {
  type        = string
  description = "SMTP port for mailbox delivery."
  default     = "587"
}

variable "email_from_address" {
  type        = string
  description = "Sender address used by backend email delivery. Leave empty for support@domain."
  default     = ""
}

variable "email_reply_to_address" {
  type        = string
  description = "Reply-to address used by backend email delivery. Leave empty for support@domain."
  default     = ""
}

variable "payment_gateway_api_key" {
  type        = string
  description = "Payment provider API key used by the payments service."
  sensitive   = true
  default     = ""
}

variable "stripe_api_version" {
  type        = string
  description = "Stripe API version header used by the payments service."
  default     = "2024-09-30.acacia"
}

variable "stripe_context" {
  type        = string
  description = "Stripe-Context target account for organization API keys, usually an acct_... value."
  sensitive   = true
  default     = ""
}
