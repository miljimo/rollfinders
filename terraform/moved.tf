moved {
  from = aws_cloudwatch_log_group.app
  to   = module.app_service.aws_cloudwatch_log_group.log_group
}

moved {
  from = aws_ecs_cluster.app
  to   = module.app_service.aws_ecs_cluster.cluster
}

moved {
  from = aws_ecs_task_definition.app
  to   = module.app_service.aws_ecs_task_definition.task[0]
}

moved {
  from = aws_ecs_service.app
  to   = module.app_service.aws_ecs_service.service[0]
}

moved {
  from = module.vpc.aws_vpc.vpc
  to   = module.networking.module.vpc.aws_vpc.vpc
}

moved {
  from = aws_internet_gateway.main
  to   = module.networking.aws_internet_gateway.main
}

moved {
  from = aws_subnet.public
  to   = module.networking.aws_subnet.public
}

moved {
  from = aws_subnet.private
  to   = module.networking.aws_subnet.private
}

moved {
  from = aws_subnet.database
  to   = module.networking.aws_subnet.database
}

moved {
  from = aws_eip.nat
  to   = module.networking.aws_eip.nat
}

moved {
  from = aws_nat_gateway.main
  to   = module.networking.aws_nat_gateway.main
}

moved {
  from = aws_route_table.public
  to   = module.networking.aws_route_table.public
}

moved {
  from = aws_route_table.private
  to   = module.networking.aws_route_table.private
}

moved {
  from = aws_route_table.database
  to   = module.networking.aws_route_table.database
}

moved {
  from = aws_route_table_association.public
  to   = module.networking.aws_route_table_association.public
}

moved {
  from = aws_route_table_association.private
  to   = module.networking.aws_route_table_association.private
}

moved {
  from = aws_route_table_association.database
  to   = module.networking.aws_route_table_association.database
}

moved {
  from = aws_lb.app
  to   = module.alb.aws_lb.app
}

moved {
  from = aws_lb_target_group.app
  to   = module.alb.aws_lb_target_group.app
}

moved {
  from = aws_lb_listener.http_redirect
  to   = module.alb.aws_lb_listener.http_redirect
}

moved {
  from = aws_lb_listener.https
  to   = module.alb.aws_lb_listener.https
}

moved {
  from = module.alb.aws_lb_listener.https
  to   = module.alb.aws_lb_listener.https[0]
}

moved {
  from = aws_lb_listener_rule.www_redirect
  to   = module.alb.aws_lb_listener_rule.www_redirect
}

moved {
  from = module.alb.aws_lb_listener_rule.www_redirect
  to   = module.alb.aws_lb_listener_rule.www_redirect[0]
}

moved {
  from = aws_acm_certificate.app
  to   = module.certificate.aws_acm_certificate.app
}

moved {
  from = module.certificate.aws_acm_certificate.app
  to   = module.certificate[0].aws_acm_certificate.app
}

moved {
  from = aws_route53_record.certificate_validation
  to   = module.certificate.aws_route53_record.certificate_validation
}

moved {
  from = module.certificate.aws_route53_record.certificate_validation
  to   = module.certificate[0].aws_route53_record.certificate_validation
}

moved {
  from = aws_acm_certificate_validation.app
  to   = module.certificate.aws_acm_certificate_validation.app
}

moved {
  from = module.certificate.aws_acm_certificate_validation.app
  to   = module.certificate[0].aws_acm_certificate_validation.app
}

moved {
  from = module.app_dns_records.aws_route53_record.frontend
  to   = module.app_dns_records[0].aws_route53_record.frontend
}

moved {
  from = module.app_dns_records.aws_route53_record.api
  to   = module.app_dns_records[0].aws_route53_record.api
}

moved {
  from = module.app_dns_records.aws_route53_record.www
  to   = module.app_dns_records[0].aws_route53_record.www
}

moved {
  from = aws_ecr_repository.app
  to   = module.ecr.aws_ecr_repository.app
}

moved {
  from = aws_ecr_lifecycle_policy.app
  to   = module.ecr.aws_ecr_lifecycle_policy.app
}

moved {
  from = aws_db_subnet_group.app
  to   = module.database.aws_db_subnet_group.app
}

moved {
  from = aws_db_instance.app
  to   = module.database.aws_db_instance.app
}

moved {
  from = aws_appautoscaling_target.ecs
  to   = module.ecs_autoscaling.aws_appautoscaling_target.ecs
}

moved {
  from = aws_appautoscaling_policy.cpu
  to   = module.ecs_autoscaling.aws_appautoscaling_policy.cpu
}

moved {
  from = aws_cloudfront_origin_access_control.assets
  to   = module.assets_cdn.aws_cloudfront_origin_access_control.assets
}

moved {
  from = aws_cloudfront_distribution.assets
  to   = module.assets_cdn.aws_cloudfront_distribution.assets
}

moved {
  from = aws_route53_record.frontend
  to   = module.app_dns_records.aws_route53_record.frontend
}

moved {
  from = aws_route53_record.www
  to   = module.app_dns_records.aws_route53_record.www
}

moved {
  from = aws_route53_record.api
  to   = module.app_dns_records.aws_route53_record.api
}
