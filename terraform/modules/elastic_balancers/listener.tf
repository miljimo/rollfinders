

# configure the load balancer listeners
resource "aws_lb_listener" "listener" {
  count             = length(local.listeners)
  load_balancer_arn = aws_lb.lb.arn
  # Please don't changed this , its recommended by Optum robot.
  port            = local.listeners[count.index].port
  protocol        = local.listeners[count.index].protocol
  certificate_arn = local.listeners[count.index].certificate_arn

  ssl_policy = (local.listeners[count.index].protocol == "HTTPS") ? "ELBSecurityPolicy-TLS-1-2-2017-01" : null

  default_action {
    target_group_arn = local.listeners[count.index].target_group_arn
    type             = local.listeners[count.index].action_type
    //order            = local.listeners[count.index].order // no allowed for default action
    fixed_response {
      content_type = "text/plain"
      message_body = "404: page not found , contact admin"
      status_code  = "404"
    }

    # If you want to route to more than one target group used the forward block
    dynamic "forward" {
      for_each = coalesce(local.listeners[count.index].forward_targets, [])
      content {
        target_group {
          arn    = lookup(forward.value, "arn")
          weight = lookup(forward.value, "weight")
        }
        stickiness {
          duration = lookup(forward.value, "duration", 0)
          enabled  = lookup(forward.value, "enabled_stickiness", false)
        }
      }
    }
  }


  tags = {
    Name = "${var.name}-listener-${count.index}"
  }
  depends_on = [aws_lb.lb]
}
