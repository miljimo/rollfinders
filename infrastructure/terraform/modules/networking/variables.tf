variable "environment_name" {
  type        = string
  description = "Deployment environment name."
}

variable "name_prefix" {
  type        = string
  description = "Name prefix for network resources."
}

variable "vpc_cidr_block" {
  type        = string
  description = "VPC CIDR block."
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones for public, private, and database subnets."
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Whether to provision a NAT Gateway and default private subnet egress route."
  default     = true
}
