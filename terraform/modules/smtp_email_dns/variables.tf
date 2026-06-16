variable "domain_name" {
  type        = string
  description = "Email domain managed for PrivateEmail SMTP delivery."
}

variable "zone_id" {
  type        = string
  description = "Route53 hosted zone ID for the sending domain."
}

variable "smtp_subdomain" {
  type        = string
  description = "Subdomain used as a friendly SMTP endpoint alias."
  default     = "smtp"
}

variable "mailbox_subdomain" {
  type        = string
  description = "Subdomain used for the mailbox webmail link."
  default     = "mail"
}

variable "smtp_target_host" {
  type        = string
  description = "Upstream PrivateEmail SMTP hostname for the friendly SMTP alias."
  default     = "mail.privateemail.com"
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
