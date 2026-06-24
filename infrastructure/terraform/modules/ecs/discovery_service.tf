
resource "aws_service_discovery_private_dns_namespace" "dns_namespace" {
  count       = var.enable_service_discovery ? 1 : 0
  name        = "${var.environment}-${var.name}-dns"
  description = "Private DNS namespace for ECS"
  vpc         = var.vpc_id
  tags = {
    Name        = "${var.name}-dns"
    environment = var.environment
  }

  # lifecycle {
  #   prevent_destroy = true
  # }
}

resource "aws_service_discovery_service" "discovery" {
  count = var.enable_service_discovery ? 1 : 0
  name  = "${var.environment}-${var.name}-discovery"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.dns_namespace[count.index].id
    dns_records {
      type = "A"
      ttl  = 10
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
  }

  depends_on = [aws_service_discovery_private_dns_namespace.dns_namespace]
}
