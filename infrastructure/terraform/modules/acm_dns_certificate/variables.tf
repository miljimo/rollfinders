variable "canonical_domain" {
  type        = string
  description = "Primary certificate domain."
}

variable "subject_alternative_names" {
  type        = list(string)
  description = "Certificate subject alternative names."
  default     = []
}

variable "zone_id" {
  type        = string
  description = "Route53 hosted zone ID for DNS validation."
}
