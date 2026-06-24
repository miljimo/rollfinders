

# ECR API endpoint
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.vpc.id
  service_name        = "com.amazonaws.eu-west-2.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.ecs_subnets[*].id
  security_group_ids  = [module.vpc_endpoints_security_group.id]
  private_dns_enabled = true
}

# ECR DKR endpoint
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.id
  service_name        = "com.amazonaws.eu-west-2.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.ecs_subnets[*].id
  security_group_ids  = [module.vpc_endpoints_security_group.id]
  private_dns_enabled = true
}



resource "aws_vpc_endpoint" "logs" {
  vpc_id              = module.vpc.id
  service_name        = "com.amazonaws.eu-west-2.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.ecs_subnets[*].id
  security_group_ids  = [module.vpc_endpoints_security_group.id]
  private_dns_enabled = true
}


# S3 Gateway endpoint (for pulling image layers)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.id
  service_name      = "com.amazonaws.eu-west-2.s3"
  route_table_ids   = [aws_route_table.ecs_private.id]
  vpc_endpoint_type = "Gateway"
  depends_on        = [module.vpc.id]
}
