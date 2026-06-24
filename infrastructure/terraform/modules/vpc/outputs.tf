output "arn" {
  value = aws_vpc.vpc.arn
}

output "id" {
  value = aws_vpc.vpc.id
}

output "cidr_block" {
  value = aws_vpc.vpc.cidr_block
}

output "default_route_table_id" {
  value = aws_vpc.vpc.default_route_table_id
}

output "default_security_group_ids" {
  value = [aws_vpc.vpc.default_security_group_id]
}