


# Creating sub-domains records
resource "aws_route53_record" "main" {

  for_each = {
    for item in var.records : item.name => {
      name    = item.name
      type    = item.type
      records = [for target in item.values : target]
      ttl     = item.ttl
    }
  }

  allow_overwrite = true
  zone_id         = var.hosted_zone_id
  name            = each.value.name
  #A, AAAA, CAA, CNAME, DS, MX, NAPTR, NS, PTR, SOA, SPF, SRV and TXT.
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}
