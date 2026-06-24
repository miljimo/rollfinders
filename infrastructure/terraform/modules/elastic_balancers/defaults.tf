

resource "aws_lb_target_group" "default" {
  count       = var.default_group_enabled ? 1 : 0
  name        = lower(substr("${var.environment}-${var.target_group.name}"), 0, 30)
  port        = var.target_group.port
  protocol    = var.target_group.protocol
  vpc_id      = var.target_group.vpc_id
  target_type = var.target_group.type
  health_check {
    path                = var.target_group.health_check.path
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200-299"
    port                = var.target_group.health_check.port
    protocol            = var.target_group.health_check.protocol
  }


  depends_on = []
}