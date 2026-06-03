output "domain_identity_arn" {
  description = "SES domain identity ARN."
  value       = aws_ses_domain_identity.email.arn
}

output "sending_domain" {
  description = "Verified email sending domain."
  value       = aws_ses_domain_identity.email.domain
}

output "mail_from_domain" {
  description = "Custom SES MAIL FROM domain."
  value       = local.mail_from_domain
}

output "smtp_host" {
  description = "Friendly SMTP hostname for backend applications."
  value       = local.smtp_domain
}

output "ses_smtp_host" {
  description = "AWS SES regional SMTP endpoint behind the friendly SMTP alias."
  value       = local.ses_smtp_host
}
