
// Cross avalibility zone replicas 
resource "aws_s3_bucket_replication_configuration" "replication_config" {
  count  = var.replication.enabled ? 1 : 0
  bucket = aws_s3_bucket.bucket.id
  role   = var.replication.role_arn
  rule {
    status = var.replication.enabled ? "Enabled" : "Disabled"
    destination {
      bucket = var.replication.bucket_id
    }
  }
  depends_on = [aws_s3_bucket.bucket, aws_s3_bucket_versioning.versioning]
}