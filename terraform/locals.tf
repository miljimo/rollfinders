locals {
  image_parameter_name   = "/${var.environment_name}/tquest/ssm/image/${var.container_service_name}"
  imagedb_parameter_name = "/${var.environment_name}/tquest/ssm/image/${var.container_db_service_name}"


  // Network Imports
  vpc_id                           = var.feature_branch ? module.external[0].vpc_id : try(data.aws_ssm_parameter.vpc_id[0].value, "")
  public_elb_security_group_ids    = var.feature_branch ? module.external[0].public_elb_security_group_ids : []
  vpc_endpoints_security_group_ids = var.feature_branch ? module.external[0].vpc_endpoints_security_group_ids : []
  private_app_subnets              = var.feature_branch ? module.external[0].private_app_subnets : []


  load_balancer_default_target_group_arn = var.feature_branch ? module.external[0].load_balancer_default_target_group_arn : null

  # Database Imports
  database_host_name = var.feature_branch ? module.external[0].database_host_name : null
  db_user            = var.feature_branch ? module.external[0].database_credential.user : null
  db_password        = var.feature_branch ? module.external[0].database_credential.password : null
  db_name            = var.feature_branch ? module.external[0].database_credential.name : null

}
