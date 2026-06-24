module "terraform_artefact_bucket" {
  source             = "../modules/s3"
  environment_name   = var.project_name
  name               = "terraform-artefact"
  use_actual_name    = false
  enabled_versioning = true
  force_deletion     = false
  acl                = "private"
  sse_algorithm      = "AES256"
}

resource "aws_s3_object" "environment_prefix" {
  for_each = var.environments

  bucket       = module.terraform_artefact_bucket.name
  key          = "${each.key}/"
  content      = ""
  content_type = "application/x-directory"
}
