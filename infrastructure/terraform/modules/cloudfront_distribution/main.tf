# Amazon CloudFront is a web service that speeds up distribution 
# of your static and dynamic web content, such as .html, .css,
#  .js, and image files, to your users. CloudFront delivers your 
#  content through a worldwide network of data centers called edge locations.
#   When a user requests content that you're serving with CloudFront,
#    the request is routed to the edge location that provides the lowest latency (time delay),
#     so that content is delivered with the best possible performance.
# https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html


locals {
  s3_origin_id = "${local.website_domain}.teletruck.net"
}



resource "aws_cloudfront_origin_access_control" "access_control" {
  name                              = "${var.environment_name}-access_control"
  description                       = "AWS Access control policy for the cloudfront- distrubuttions"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"

}

resource "aws_cloudfront_distribution" "website_distribution" {

  depends_on = [module.teletruck_website_bucket]

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  origin {
    domain_name = module.teletruck_website_bucket.website_endpoint
    origin_id   = local.s3_origin_id

    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }

  }


  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 3600
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US", "CA", "GB", "DE"]
    }
  }

  viewer_certificate {
    acm_certificate_arn = data.aws_acm_certificate.cloudfront.arn
    # if you want to use your own certificate make sure its hosted in US-EAST-1.
    # cloudfront_default_certificate = true
    ssl_support_method = "sni-only"
  }

  aliases = ["${local.website_domain}.teletruck.net",
    "www.${local.website_domain}.teletruck.net",
    "${local.website_domain}.teletruck.org",
  "www.${local.website_domain}.teletruck.org"]
  wait_for_deployment = true

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name      = "${local.website_domain}.teletruck.net"
    AliasName = "www.${local.website_domain}.teletruck.net"
  }

}

output "origin_domain" {
  value = module.teletruck_website_bucket.website_endpoint
}