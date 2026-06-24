resource "aws_ecs_cluster" "cluster" {
  name = coalesce(var.cluster_name, "${var.environment}-${var.name}-custom-cluster")
  tags = {
    Name        = var.name
    Environment = var.environment
  }
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
