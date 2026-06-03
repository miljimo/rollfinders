/*
   Still need strong understanding of this and also documentation of complianance around this area.
*/

resource "aws_s3_bucket_ownership_controls" "controls" {
  bucket = aws_s3_bucket.bucket.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "access_block" {
  count                   = var.index_document != null ? 1 : 0
  bucket                  = aws_s3_bucket.bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  depends_on = [aws_s3_bucket_lifecycle_configuration.lifecycle_configuration]
}

# resource "aws_s3_bucket_acl" "acl"{
#   bucket  =  aws_s3_bucket.bucket.id
#    access_control_policy {
#      grant {
#        grantee {
#          id = data.aws_canonical_user_id.current.id
#          type= "CanonicalUser"
#        }
#        permission = "READ"
#      }
#      owner {
#        id = data.aws_canonical_user_id.current.id
#      }
#    }

#   depends_on = [ aws_s3_bucket_ownership_controls.controls]
# }