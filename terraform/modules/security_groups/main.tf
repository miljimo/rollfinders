# create a bastion host/ jump server
resource "aws_security_group" "security" {
  vpc_id = var.vpc_id
  name   = "${var.environment_name}-${var.name}"

  dynamic "ingress" {
    for_each = var.inbound_rules
    content {
      from_port       = lookup(ingress.value, "from")
      to_port         = lookup(ingress.value, "to")
      protocol        = lookup(ingress.value, "protocol", "-1")
      cidr_blocks     = lookup(ingress.value, "cidr_blocks", [])
      security_groups = lookup(ingress.value, "security_groups", [])
      description     = lookup(ingress.value, "description", "Terrform managed inbound rule")
      prefix_list_ids = lookup(ingress.value, "prefix_list_ids", [])
    }
  }


  dynamic "egress" {
    for_each = var.outbound_rules
    content {
      from_port       = lookup(egress.value, "from")
      to_port         = lookup(egress.value, "to")
      protocol        = lookup(egress.value, "protocol", "-1")
      cidr_blocks     = lookup(egress.value, "cidr_blocks", [])
      security_groups = lookup(egress.value, "security_groups", [])
      prefix_list_ids = lookup(egress.value, "prefix_list_ids", [])
      description     = lookup(egress.value, "description", "Terrform managed outbound rule")
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name         = "${var.environment_name}-${var.name}"
    IngressCount = length(var.inbound_rules)
    EgressCount  = length(var.outbound_rules)
  }
}

