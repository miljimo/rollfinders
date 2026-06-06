variable "domain_name" {
  type        = string
  description = "Email sending domain to verify in SES."
}

variable "zone_id" {
  type        = string
  description = "Route53 hosted zone ID for the sending domain."
}

variable "aws_region" {
  type        = string
  description = "AWS region where SES is provisioned."
}

variable "mail_from_subdomain" {
  type        = string
  description = "Subdomain used for the SES custom MAIL FROM domain."
  default     = "mail"
}

variable "smtp_subdomain" {
  type        = string
  description = "Subdomain used as a friendly SMTP endpoint alias."
  default     = "smtp"
}

variable "dmarc_rua_email" {
  type        = string
  description = "Aggregate DMARC report mailbox."
}

variable "privateemail_dkim_txt_value" {
  type        = string
  description = "Provider-supplied PrivateEmail DKIM public TXT value for privateemail._domainkey. Leave empty until PrivateEmail issues the value."
  default     = ""
}
