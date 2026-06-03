

# Create the internet gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = module.vpc.id
  tags = {
    Name = "tquest-igw"
  }
}


# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = module.vpc.id
  tags = {
    Name        = "${var.environment_name}-public-route-table"
    Environment = var.environment_name
  }
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

# Associate route table with public subnets
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.elb_subnets)
  subnet_id      = aws_subnet.elb_subnets[count.index].id
  route_table_id = aws_route_table.public.id

  depends_on = [
    aws_internet_gateway.igw,
    aws_route_table.public
  ]
}
