variable "aws_region" {
  type        = string
  description = "AWS region for Terraform state resources."
  default     = "eu-west-2"
}

variable "project_name" {
  type        = string
  description = "Project name used for state resource names."
  default     = "rollfinder"
}

variable "environments" {
  type        = set(string)
  description = "Environment names that need isolated state."
  default     = ["dev", "staging", "production"]
}
