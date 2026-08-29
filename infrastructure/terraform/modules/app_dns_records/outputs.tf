output "frontend_fqdn" {
  description = "Canonical frontend record name."
  value       = aws_route53_record.frontend.fqdn
}

output "www_fqdn" {
  description = "WWW frontend record name, when configured."
  value       = try(aws_route53_record.www[0].fqdn, "")
}
