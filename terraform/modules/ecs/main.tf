resource "aws_ecs_cluster" "cluster" {
  name = "${var.environment}-${var.name}-custom-cluster"
  tags = {
    Name        = var.name
    Environment = var.environment
  }
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

