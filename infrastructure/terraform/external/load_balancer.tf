

module "tquest_load_balancer" {
  source                  = "../modules/elastic_balancers"
  name                    = "tquest-alb"
  default_group_enabled   = true
  security_group_ids      = [module.elb_security_group.id]
  environment             = var.environment_name
  subnet_ids              = aws_subnet.elb_subnets[*].id
  internet_gateway_id     = aws_internet_gateway.igw.id
  vpc_id                  = module.vpc.id
  attach_internet_gateway = true
  internal                = false

  target_group = {
    vpc_id = module.vpc.id
    name   = "tquest-tg"
    health_check = {
      path = "/health/check.php"
    }
  }
  depends_on = [module.vpc, aws_route_table_association.public]
}
