module "vpc_endpoints_security_group" {
  source           = "../modules/security_groups"
  name             = "vpc-endpoint-sg"
  environment_name = var.environment_name
  vpc_id           = module.vpc.id

  inbound_rules = [
    {
      from        = 443
      to          = 443
      protocol    = "tcp"
      description = "Allow HTTPS traffic from ECS tasks"
      cidr_blocks = [var.vpc_cidr_block]
    }
  ]

  outbound_rules = [
    {
      from        = 443
      to          = 443
      protocol    = "tcp"
      description = "Allow outbound to interface endpoints"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
  depends_on = [module.vpc]
}



module "elb_security_group" {
  source           = "../modules/security_groups"
  name             = "alb-sg"
  description      = "Security group for the ALB"
  vpc_id           = module.vpc.id
  environment_name = var.environment_name

  // Allow inbound HTTP traffic from the internet
  inbound_rules = [
    {
      from        = 80
      to          = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
  }]

  // Allow all outbound traffic to the ECS tasks
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"] #[aws_subnet.elb_subnets[*].cidr_block]
    }
  ]
  depends_on = [module.vpc]
}


// The database security group for testing purposes
module "ecs_db_service_security_group" {
  source           = "../modules/security_groups"
  name             = "ecs-db-sg"
  description      = "Security group for the tQuest DB ECS tasks for testing"
  vpc_id           = module.vpc.id
  environment_name = var.environment_name

  inbound_rules = [
    {
      from            = 1433
      to              = 1433
      protocol        = "tcp"
      security_groups = var.service_security_group_ids
      description     = "Allow traffic from the web server tasks"
    }
  ]
  outbound_rules = [
    {
      from        = 0
      to          = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      from            = 443
      to              = 443
      protocol        = "tcp"
      security_groups = [module.vpc_endpoints_security_group.id]
      description     = "Allow ECS tasks to talk to ECR endpoint"
    }
  ]

  depends_on = [module.vpc,
  module.vpc_endpoints_security_group]

}