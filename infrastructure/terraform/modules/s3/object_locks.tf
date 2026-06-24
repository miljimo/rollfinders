
# Configure object locks to prevent object to be deleted when its created
# this is common to complainance documents that have specific life-cycled.

resource "aws_s3_bucket_object_lock_configuration" "object_lock_configuration" {
  count               = var.locking_configuration.enabled ? 1 : 0
  bucket              = aws_s3_bucket.bucket.id
  token               = lookup(var.locking_configuration, "token", null)
  object_lock_enabled = var.locking_configuration.enabled ? "Enabled" : "Disabled"

  # The rules

  dynamic "rule" {
    for_each = lookup(var.locking_configuration, "retentions", [])
    content {
      default_retention {
        days  = lookup(rule.value, "days", null)
        years = lookup(rule.value, "years", null)
        mode  = lookup(rule.value, "mode", null)
      }
    }
  }
  depends_on = [aws_s3_bucket.bucket, aws_s3_bucket_versioning.versioning]
}