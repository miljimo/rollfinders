
variable "environment_name" {
  type        = string
  description = "Deployment environment terraform"
}
variable "name" {
  type = string
}

variable "cidr_block" {
  default = "10.0.0.0/24"
  type    = string
}
variable "create_default_security_group" {
  type        = bool
  description = "Create a default security group if none is specific"
  default     = false
}