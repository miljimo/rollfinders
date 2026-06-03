# Create a load balancer
resource "aws_lb" "lb" {
  name               = substr("${var.environment}-${var.name}", 0, 32)
  load_balancer_type = var.type
  internal           = var.internal
  # Application load balance needs a security group and the subnets
  security_groups            = var.security_group_ids
  subnets                    = var.subnet_ids
  enable_deletion_protection = var.enabled_deletion_production
  drop_invalid_header_fields = true
  preserve_host_header       = true
  xff_header_processing_mode = "preserve"
  # Information to the bucket location where the load balancer
  # have to send its logs
  # this means the load balancer must have access to this bucket.
  # Make sure that the bucket policy allow the load balance to access and put 
  # logs in the specific locations
  dynamic "access_logs" {
    for_each = var.logs_bucket_name != null ? [1] : []
    content {
      bucket  = var.logs_bucket_name
      prefix  = var.log_prefix
      enabled = true
    }
  }

  # Subnet where you want the load balancer to be attached to
  # you can specific more than one subnet per availability zones.
  dynamic "subnet_mapping" {
    for_each = var.subnet_mappings
    content {
      subnet_id     = lookup(subnet_mapping.value, "id")
      allocation_id = lookup(subnet_mapping.value, "allocation_id")
    }
  }

  tags = {
    Name            = "${var.environment}-${var.name}"
    Environment     = var.environment
    AccessBucket    = var.logs_bucket_name
    AttachedSubnets = length(var.subnet_mappings)
  }
}



resource "aws_wafregional_web_acl_association" "foo" {
  count        = var.web_acl_id != null ? 1 : 0
  resource_arn = aws_lb.lb.arn
  web_acl_id   = var.web_acl_id
}

# # ALB needs an internet gateway to be able to route traffic from the internet
# resource "aws_internet_gateway_attachment" "example" {
#   # count=  var.attach_internet_gateway  ? 1 : 0
#   internet_gateway_id = var.internet_gateway_id
#   vpc_id              = var.vpc_id

#   depends_on = [ aws_lb.lb ]
# }

# This is an example of how to create a listener rule for the load balancer
#  
# # # Create listeners rules
# resource "aws_lb_listener_rule" "rule" {
#  count  =  length(local.listeners)
#  listener_arn = aws_lb_listener.listener[0].arn
#  priority     = 100
#  action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.static.arn
#   }

#  condition {
#    path_pattern {
#       values = ["/static/*"]
#     }
#  }
# }