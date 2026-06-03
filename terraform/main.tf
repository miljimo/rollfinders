// Terraform ECS module for tquest-web-server service

module "ecs_service_security_group" {
  source           = "./modules/security_groups"
  name             = "ecs-sg"
  description      = "Security group for the tQuest ECS tasks"
  vpc_id           = local.vpc_id
  environment_name = var.environment_name

  inbound_rules = [
    {
      from            = 80
      to              = 80
      protocol        = "tcp"
      security_groups = local.public_elb_security_group_ids
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      from            = 443
      to              = 443
      protocol        = "tcp"
      security_groups = local.vpc_endpoints_security_group_ids
      description     = "Allow ECS tasks to talk to ECR endpoint"
    }
  ]

  depends_on = []
}



## Create the ECS task role for the web server
module "ecs_task_role" {
  source      = "./modules/roles"
  environment = var.environment_name
  name        = "db_task_role"
  assume_role_principals = [
    {
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  ]

  statements = [
    {
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "kms:Decrypt",
        "secretsmanager:GetSecretValue"
      ]
      resources = ["*"]
    }
  ]
}


module "tquest-web-server" {
  source          = "./modules/ecs"
  name            = "tquest"
  environment     = var.environment_name
  task_role_arn   = module.ecs_task_role.arn
  subnets         = local.private_app_subnets
  security_groups = [module.ecs_service_security_group.id]
  desired_count   = 1

  task_definitions = [
    {
      name  = var.container_service_name
      image = data.aws_ssm_parameter.tquest_image.value
      ports = [
        {
          container_port = 80
          host_port      = 80
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost/health/check.php || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
      environments = [
        {
          name  = "C_DBHOSTNAME"
          value = "${local.database_host_name},1433"
        },
        {
          name  = "C_DBUSERNAME"
          value = local.db_user
        },
        {
          name  = "C_DBUSERPASSWORD"
          value = local.db_password
        },
        {
          name  = "C_DBNAME"
          value = local.db_name
        }
      ]
    }
  ]

  load_balancer = {
    target_group_arn = local.load_balancer_default_target_group_arn
    container_name   = var.container_service_name
    container_port   = 80
  }
  depends_on = [
    data.aws_ssm_parameter.tquest_image,
    module.external
  ]
}
