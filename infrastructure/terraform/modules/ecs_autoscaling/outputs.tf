output "target_resource_id" {
  description = "Autoscaling target resource ID."
  value       = aws_appautoscaling_target.ecs.resource_id
}
