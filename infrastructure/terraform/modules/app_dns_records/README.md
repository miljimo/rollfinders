# Frontend DNS records

Creates Route53 alias records for a frontend's canonical domain and optional
`www` domain. Backend API records are intentionally outside this module so the
backend deployment can own its DNS independently.

```hcl
module "app_dns_records" {
  source           = "./modules/app_dns_records"
  zone_id          = data.aws_route53_zone.public.zone_id
  canonical_domain = "rollfinders.com"
  www_domain       = "www.rollfinders.com"
  alb_dns_name     = module.alb.dns_name
  alb_zone_id      = module.alb.zone_id
}
```
