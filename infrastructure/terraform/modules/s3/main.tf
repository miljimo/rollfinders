/* 
  Creating S3 Modules for the S3 Bucket ,
  This should allow the configuration of any S3 buckets with more opinionated 
  configurations.
  From my understanding of S3 bucket configurations.
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
*/


resource "aws_s3_bucket" "bucket" {
  bucket              = var.use_actual_name ? var.name : local.unique_name
  object_lock_enabled = var.lock_enabled
  force_destroy       = var.force_deletion


  lifecycle {

  }

  tags = {
    BranchName = var.environment_name
    Name       = var.use_actual_name ? var.name : local.unique_name
  }
}

// Who pays for use of the bucket
resource "aws_s3_bucket_request_payment_configuration" "request_payment_configuration" {
  bucket = aws_s3_bucket.bucket.id
  payer  = var.payer
}
