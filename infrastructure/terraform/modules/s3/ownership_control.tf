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
  count                   = var.block_public_access ? 1 : 0
  bucket                  = aws_s3_bucket.bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

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
