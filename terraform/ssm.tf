data "aws_ssm_parameter" "tquest_image" {
  name = local.image_parameter_name
}

data "aws_ssm_parameter" "tquestdb_image" {
  name = local.imagedb_parameter_name
}

// Important ssm parameters
data "aws_ssm_parameter" "vpc_id" {
  count = var.feature_branch ? 0 : 1
  name  = "/${var.environment_name}/ssm/tquest/vpc/id"
}
