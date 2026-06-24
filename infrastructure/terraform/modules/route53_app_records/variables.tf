variable "zone_id" {
  type = string
}

variable "canonical_domain" {
  type = string
}

variable "api_domain" {
  type = string
}

variable "www_domain" {
  type    = string
  default = ""
}

variable "alb_dns_name" {
  type = string
}

variable "alb_zone_id" {
  type = string
}
