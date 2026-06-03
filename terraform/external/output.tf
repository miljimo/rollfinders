output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.id
}

output "private_app_subnets" {
  description = "List of private application subnets"
  value       = aws_subnet.ecs_subnets[*].id
}

output "public_elb_security_group_ids" {
  description = "List of public ELB subnets"
  value       = [module.elb_security_group.id]
}
output "vpc_endpoints_security_group_ids" {
  description = "The security group ID for the VPC endpoints"
  value       = [module.vpc_endpoints_security_group.id]
}

output "database_host_name" {
  description = "The database host name"
  value       = module.tquest_database_server.service_dns_name
}

output "load_balancer_arn" {
  description = "TQuest load balancer ARN"
  value       = module.tquest_load_balancer.arn
}

output "load_balancer_default_target_group_arn" {
  value       = module.tquest_load_balancer.default_target_group_arn
  description = "default target group for the load balancer"
}

output "database_credential" {
  description = "contains the credential for the database access"
  value       = var.database_credential
}