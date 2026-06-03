
output "arn" {
  value       = aws_lb.lb.arn
  description = "return the arn of the load balancer to the caller of the module."
}

output "name" {
  value       = aws_lb.lb.name
  description = "return the name of the load balancer to the caller of the module."
}

output "default_target_group_arn" {
  value       = aws_lb_target_group.default[0].arn
  description = "return the default target group arn of the load balancer to the caller of the module."
}