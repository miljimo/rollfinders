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
