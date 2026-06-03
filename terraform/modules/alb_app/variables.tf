variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "security_group_ids" {
  type = list(string)
}

variable "subnet_ids" {
  type = list(string)
}

variable "certificate_arn" {
  type = string
}

variable "canonical_domain" {
  type = string
}

variable "www_domain" {
  type    = string
  default = ""
}
