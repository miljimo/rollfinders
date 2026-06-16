output "sending_domain" {
  description = "Email sending domain."
  value       = var.domain_name
}

output "mailbox_domain" {
  description = "Mailbox webmail domain."
  value       = local.mailbox_domain
}

output "smtp_host" {
  description = "Friendly SMTP hostname for backend applications."
  value       = local.smtp_domain
}
