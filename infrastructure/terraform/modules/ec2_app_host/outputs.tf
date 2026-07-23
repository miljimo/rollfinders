output "instance_id" {
  description = "EC2 app host instance ID."
  value       = aws_instance.host.id
}

output "private_ip" {
  description = "EC2 app host private IP address."
  value       = aws_instance.host.private_ip
}

output "public_ip" {
  description = "EC2 app host public IP address."
  value       = aws_instance.host.public_ip
}

output "role_arn" {
  description = "EC2 app host IAM role ARN."
  value       = aws_iam_role.host.arn
}
