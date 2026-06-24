/*
 Configuration of the bucket life cycle.
   Is base on two configurations
  1) Transition: Amazon determined which object to moved to a different storage or archieve
  2) Expiration: actions: this actions determined which object expired and amazon
  deletes them one your behalf when the objects are expired.

  To keep track of S3 Life-Cycle  Amazon S3 Storage Lens is used to track the metrics.
  
*/
resource "aws_s3_bucket_lifecycle_configuration" "lifecycle_configuration" {
  count  = length(var.life_cycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.bucket.id



  dynamic "rule" {
    for_each = var.life_cycle_rules
    content {

      id = "${var.name}-rule-${rule.key}"
      expiration {
        date = lookup(rule.value, "expire_date", null)
        days = lookup(rule.value, "expire_days", null)
      }
      filter {
        prefix = lookup(rule.value, "prefix", "")
        # in bytes
        object_size_greater_than = lookup(rule.value, "object_size_greater_than", 0)
        object_size_less_than    = lookup(rule.value, "object_size_less_than")
        # the and additional folder configuration
        dynamic "and" {
          for_each = lookup(rule.value, "and_additional", [])
          content {
            prefix                   = lookup(and.value, "prefix", "")
            object_size_greater_than = lookup(and.value, "object_size_greater_than", 0)
            object_size_less_than    = lookup(and.value, "object_size_less_than")
          }
        }

        dynamic "tag" {
          for_each = lookup(rule.value, "tags", {})
          content {
            key   = tag.key
            value = tag.value
          }
        }
      }
      # Transition of the bucket to a higher storage bucket.
      dynamic "transition" {
        for_each = lookup(rule.value, "transitions", [])
        content {
          storage_class = lookup(transition.value, "storage_class")
          days          = lookup(transition.value, "days", null)
          date          = lookup(transition.value, "date", null)
        }
      }
      status = can(rule.value["status"]) ? "Enabled" : "Disabled"
    }
  }
}