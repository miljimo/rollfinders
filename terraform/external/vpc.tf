module "vpc" {
  source           = "../modules/vpc"
  name             = "mock_tquest-vpc"
  environment_name = var.environment_name
  cidr_block       = var.vpc_cidr_block
}

# The public subnets for the load balancer
resource "aws_subnet" "elb_subnets" {
  count                   = 2
  vpc_id                  = module.vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr_block, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "elb-subnet-${count.index + 1}"
  }
}

# The private subnets for the ECS tasks
resource "aws_subnet" "ecs_subnets" {
  count                   = 2
  vpc_id                  = module.vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr_block, 8, count.index + 2)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "ecs-subnet-${count.index + 1}"
  }
}

# The Database subnets for the RDS instance
resource "aws_subnet" "db_subnets" {
  count                   = 2
  vpc_id                  = module.vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr_block, 8, count.index + 4)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "database-subnet-${count.index + 1}"
  }
}


resource "aws_route_table" "ecs_private" {
  vpc_id = module.vpc.id
  tags = {
    Name        = "${var.environment_name}-ecs-private-route-table"
    Environment = var.environment_name
  }
}


resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.ecs_subnets)
  subnet_id      = aws_subnet.ecs_subnets[count.index].id
  route_table_id = aws_route_table.ecs_private.id
}

