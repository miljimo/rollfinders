locals {
  name_prefix   = "${var.project_name}-${var.environment_name}"
  is_production = var.environment_name == "production"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment_name
    ManagedBy   = "terraform"
  }
}
