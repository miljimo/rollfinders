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

variable "container_image" {
  type        = string
  description = "Fully qualified container image to deploy to ECS."
  default     = "public.ecr.aws/docker/library/node:22-alpine"
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

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for HTTPS. Leave empty to create only HTTP listener."
  default     = ""
}

variable "domain_name" {
  type        = string
  description = "Optional DNS name for the app, such as dev.rollfinder.example.com."
  default     = ""
}

variable "route53_zone_id" {
  type        = string
  description = "Optional Route53 hosted zone ID for domain_name."
  default     = ""
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

variable "app_secrets" {
  type        = map(string)
  description = "Application secrets written to Secrets Manager as a JSON object."
  sensitive   = true
  default     = {}
}
