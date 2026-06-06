locals {
  mail_from_domain             = "${var.mail_from_subdomain}.${var.domain_name}"
  privateemail_dkim_txt_chunks = regexall(".{1,255}", var.privateemail_dkim_txt_value)
  privateemail_dkim_txt_record = join("\"\"", local.privateemail_dkim_txt_chunks)
  smtp_domain                  = "${var.smtp_subdomain}.${var.domain_name}"
  ses_smtp_host                = "email-smtp.${var.aws_region}.amazonaws.com"
}

resource "aws_ses_domain_identity" "email" {
  domain = var.domain_name
}

resource "aws_route53_record" "identity_verification" {
  zone_id = var.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.email.verification_token]
}

resource "aws_ses_domain_identity_verification" "email" {
  domain = aws_ses_domain_identity.email.id

  depends_on = [aws_route53_record.identity_verification]
}

resource "aws_ses_domain_dkim" "email" {
  domain = aws_ses_domain_identity.email.domain
}

resource "aws_route53_record" "dkim" {
  count   = 3
  zone_id = var.zone_id
  name    = "${aws_ses_domain_dkim.email.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.email.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_mail_from" "email" {
  domain           = aws_ses_domain_identity.email.domain
  mail_from_domain = local.mail_from_domain
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "apex_mx" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 600
  records = [
    "10 mx1.privateemail.com",
    "10 mx2.privateemail.com"
  ]
}

resource "aws_route53_record" "apex_spf" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com include:spf.privateemail.com -all"]
}

resource "aws_route53_record" "privateemail_dkim" {
  count   = var.privateemail_dkim_txt_value == "" ? 0 : 1
  zone_id = var.zone_id
  name    = "privateemail._domainkey.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [local.privateemail_dkim_txt_record]
}

resource "aws_route53_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=quarantine; rua=mailto:${var.dmarc_rua_email}; fo=1"]
}

resource "aws_route53_record" "smtp_alias" {
  zone_id = var.zone_id
  name    = local.smtp_domain
  type    = "CNAME"
  ttl     = 600
  records = [local.ses_smtp_host]
}
