
output "arn" {
  value = aws_ecs_cluster.cluster.arn
}

output "cluster_name" {
  value = aws_ecs_cluster.cluster.name
}

output "service_arn" {
  value = try(aws_ecs_service.service[0].arn, null)
}

output "service_name" {
  value = try(aws_ecs_service.service[0].name, null)
}

output "task_definition_arn" {
  value = try(aws_ecs_task_definition.task[0].arn, null)
}

output "service_dns_name" {
  value = try(
    "${aws_service_discovery_service.discovery[0].name}.${aws_service_discovery_private_dns_namespace.dns_namespace[0].name}",
    ""
  )
  description = "The private DNS name of the database service for ECS service discovery (empty if disabled)"
}
