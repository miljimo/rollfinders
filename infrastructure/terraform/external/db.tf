/*
 Deploy a fixture DB for testing purposes

*/

module "tquest_database_server" {
  source                   = "../modules/ecs"
  name                     = var.container_db_service_name
  environment              = var.environment_name
  use_default_task_role    = true
  subnets                  = aws_subnet.ecs_subnets[*].id
  security_groups          = [module.ecs_db_service_security_group.id]
  desired_count            = 1
  vpc_id                   = module.vpc.id
  enable_service_discovery = true
  task_definitions = [
    {
      cpu    = 1024
      memory = 2048
      name   = var.container_db_service_name
      image  = var.db_image
      ports = [
        {
          container_port = 1433
          host_port      = 1433
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P ${var.database_credential.sa_password} -Q 'SELECT 1'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      // This will changed as we and move to secrets manager
      environments = [
        {
          value = var.database_credential.name
          name  = "DB_NAME"
        },
        {
          value = var.database_credential.user
          name  = "DB_USER"
        },
        {
          name  = "DB_PASSWORD"
          value = var.database_credential.password
        },
        {
          name  = "AUTO_RESTORE_DB"
          value = var.database_credential.auto_restore_db ? "true" : "false"
        },
        {
          name  = "SA_PASSWORD"
          value = var.database_credential.sa_password
        }
      ]
    }
  ]
}