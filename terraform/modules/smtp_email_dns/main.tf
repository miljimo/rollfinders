locals {
  mailbox_domain               = "${var.mailbox_subdomain}.${var.domain_name}"
  privateemail_dkim_txt_chunks = regexall(".{1,255}", var.privateemail_dkim_txt_value)
  privateemail_dkim_txt_record = join("\"\"", local.privateemail_dkim_txt_chunks)
  smtp_domain                  = "${var.smtp_subdomain}.${var.domain_name}"
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
  records = ["v=spf1 include:spf.privateemail.com -all"]
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
  records = [var.smtp_target_host]
}
