resource "aws_ecs_cluster" "app" {
  name = var.name
}

output "cluster_name" {
  value = aws_ecs_cluster.app.name
}
