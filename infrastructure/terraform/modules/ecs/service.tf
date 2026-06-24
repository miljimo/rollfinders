resource "aws_ecs_service" "service" {
  count                  = length(var.task_definitions) > 0 ? 1 : 0
  name                   = coalesce(var.service_name, var.task_definitions[count.index].name)
  cluster                = aws_ecs_cluster.cluster.id
  task_definition        = aws_ecs_task_definition.task[count.index].arn
  desired_count          = var.desired_count
  launch_type            = var.launch_type
  enable_execute_command = true


  network_configuration {
    subnets          = var.subnets
    security_groups  = var.security_groups
    assign_public_ip = var.assign_public_ip
  }
  # If you want to enable service discovery for the service

  dynamic "service_registries" {
    for_each = var.enable_service_discovery ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.discovery[0].arn
    }
  }


  # If you want to attach a load balancer to the service
  # you must provide the load balancer object with the
  # target group arn, container name and container port
  # where the load balancer will route the traffic to.
  # The target group must be created outside of this module
  # and passed as variable.
  dynamic "load_balancer" {
    for_each = var.load_balancer != null ? [var.load_balancer] : []
    content {
      # for classic load balancer , 
      elb_name = load_balancer.value.name
      # set this to null for classic load balancer
      # for application load balancer set this to the target group arn
      target_group_arn = load_balancer.value.target_group_arn
      container_name   = load_balancer.value.container_name
      container_port   = load_balancer.value.container_port

    }
  }

  tags = {
    Name        = "${var.environment}-${var.name}"
    Environment = var.environment
  }

  depends_on = [aws_ecs_cluster.cluster,
    aws_ecs_task_definition.task,
  aws_service_discovery_service.discovery]
}
