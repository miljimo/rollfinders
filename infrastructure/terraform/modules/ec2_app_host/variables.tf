variable "name_prefix" {
  type        = string
  description = "Environment-scoped resource name prefix."
}

variable "subnet_id" {
  type        = string
  description = "Subnet where the EC2 app host runs."
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security groups attached to the EC2 app host."
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type."
  default     = "t3.medium"
}

variable "root_volume_size" {
  type        = number
  description = "Root EBS volume size in GiB."
  default     = 30
}

variable "ssm_parameter_arns" {
  type        = list(string)
  description = "SSM parameters the app host can read."
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to module resources."
  default     = {}
}
