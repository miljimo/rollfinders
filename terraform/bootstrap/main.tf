resource "aws_s3_bucket" "state" {
  for_each = var.environments
  bucket   = "${var.project_name}-${each.key}-terraform-state"

  tags = {
    Project     = var.project_name
    Environment = each.key
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "state" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  for_each = aws_s3_bucket.state
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  for_each                = aws_s3_bucket.state
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "locks" {
  for_each     = var.environments
  name         = "${var.project_name}-${each.key}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Project     = var.project_name
    Environment = each.key
    ManagedBy   = "terraform"
  }
}
