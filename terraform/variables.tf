variable "project_name" {
  type        = string
  description = "Application name used for resource naming."
  default     = "rollfinder"
}

variable "environment_name" {
  type        = string
  description = "Deployment environment: dev, staging, or production."

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment_name)
    error_message = "environment_name must be dev, staging, or production."
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

variable "image_uri" {
  type        = string
  description = "Immutable ECR image URI pushed by the deployment pipeline."
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
