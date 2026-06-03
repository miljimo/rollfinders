
locals {
  task_role_arn = var.use_default_task_role ? module.ecs_default_task_role[0].arn : var.task_role_arn
}