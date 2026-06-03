/*
 Manages a revision of an ECS task definition to be used in aws_ecs_service.
  References: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
  https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Container.html
*/
resource "aws_cloudwatch_log_group" "log_group" {
  name              = "/${var.environment}/ecs/${var.name}"
  retention_in_days = 30
}

resource "aws_ecs_task_definition" "task" {
  count                    = (length(var.task_definitions) > 0) ? 1 : 0
  family                   = "${var.environment}-${var.name}-task"
  cpu                      = var.cpu
  memory                   = var.memory
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  execution_role_arn       = module.ecs_execution_role.arn
  # The role the task can assume to make AWS API calls
  # to other AWS services.
  task_role_arn = local.task_role_arn
  container_definitions = jsonencode([
    for task in var.task_definitions : {
      name      = task.name
      image     = "${task.image}"
      cpu       = task.cpu
      memory    = task.memory
      essential = task.essential
      command   = task.command
      user      = "0"

      portMappings = [
        for port in task.ports : {
          containerPort = port.container_port
          hostPort      = port.host_port
          protocol      = port.protocol
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.log_group.name
          awslogs-region        = task.log_region
          awslogs-stream-prefix = "${var.environment}-${task.name}"
          awslogs-create-group  = "true"
        }
      }

      healthCheck = {
        command     = task.healthCheck.command
        interval    = task.healthCheck.interval
        timeout     = task.healthCheck.timeout
        retries     = task.healthCheck.retries
        startPeriod = task.healthCheck.startPeriod
      }

      environment = task.environments != null ? [
        for env in task.environments : {
          name  = env.name
          value = env.value
        }
      ] : null
  }])

  tags = {
    Name = "${var.environment}-${var.name}"
  }

  depends_on = [aws_cloudwatch_log_group.log_group]
}