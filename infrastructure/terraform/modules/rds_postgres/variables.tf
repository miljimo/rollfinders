variable "name_prefix" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  type = string
}

variable "backup_retention_period" {
  type        = number
  description = "Automated backup retention period in days."
}

variable "multi_az" {
  type        = bool
  description = "Whether to run the database as a Multi-AZ deployment."
}

variable "is_production" {
  type = bool
}
