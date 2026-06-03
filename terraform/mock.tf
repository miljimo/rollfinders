//The mock module for testing purposes on development branches
module "external" {
  count                      = var.feature_branch ? 1 : 0
  source                     = "./external"
  service_security_group_ids = [module.ecs_service_security_group.id]
  db_image                   = data.aws_ssm_parameter.tquestdb_image.value
  environment_name           = var.environment_name
  container_db_service_name  = var.container_db_service_name
}
