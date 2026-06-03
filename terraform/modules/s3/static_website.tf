resource "aws_s3_bucket_website_configuration" "website_configuration" {
  count  = var.index_document == null && var.redirect_all == null ? 0 : 1
  bucket = aws_s3_bucket.bucket.id
  index_document {
    suffix = var.index_document
  }

  error_document {
    key = var.error_document != null ? var.error_document : var.index_document
  }
}


#  Configuration of the cors-settings for the bucket
resource "aws_s3_bucket_cors_configuration" "cors-configuration" {
  count  = length(var.cors_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.bucket.id
  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      allowed_origins = cors_rule.value["allowed_origins"]
      allowed_methods = cors_rule.value["allowed_methods"]
      expose_headers  = lookup(cors_rule.value, "expose_headers", null)
      allowed_headers = lookup(cors_rule.value, "allowed_headers", null)
      max_age_seconds = lookup(cors_rule.value, "max_age_seconds", 3600)
    }
  }

}