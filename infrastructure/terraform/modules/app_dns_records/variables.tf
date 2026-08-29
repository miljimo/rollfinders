variable "zone_id" {
  type        = string
  description = "Route53 hosted zone ID for the frontend records."
}

variable "canonical_domain" {
  type        = string
  description = "Canonical frontend domain name."
}

variable "www_domain" {
  type        = string
  description = "Optional www frontend domain name."
  default     = ""
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name of the frontend application load balancer."
}

variable "alb_zone_id" {
  type        = string
  description = "Canonical hosted zone ID of the frontend load balancer."
}
