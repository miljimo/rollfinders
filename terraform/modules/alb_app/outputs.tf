output "dns_name" {
  value = aws_lb.app.dns_name
}

output "zone_id" {
  value = aws_lb.app.zone_id
}

output "target_group_arn" {
  value = aws_lb_target_group.app.arn
}

output "http_listener_arn" {
  value = aws_lb_listener.http_redirect.arn
}

output "https_listener_arn" {
  value = try(aws_lb_listener.https[0].arn, null)
}
