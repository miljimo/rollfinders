resource "aws_vpc" "vpc" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = var.name
    CICD = var.cidr_block
  }
}



module "default_security_group" {
  count            = var.create_default_security_group ? 1 : 0
  source           = "../security_groups"
  name             = "${var.name}-default-sg"
  vpc_id           = aws_vpc.vpc.id
  environment_name = var.environment_name
}