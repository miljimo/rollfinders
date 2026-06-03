module "state_bucket" {
  for_each = var.environments

  source             = "../modules/s3"
  environment_name   = each.key
  name               = "${var.project_name}-${each.key}-terraform-state"
  use_actual_name    = true
  enabled_versioning = true
  force_deletion     = false
  acl                = "private"
  sse_algorithm      = "AES256"
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
