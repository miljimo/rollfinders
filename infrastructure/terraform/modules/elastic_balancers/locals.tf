data "aws_caller_identity" "current" {}

# data "aws_s3_bucket" "bucket" {
#   count  = var.logs_bucket_arn != null ? 1 : 0
#   bucket = var.logs_bucket_arn

# }

locals {
  account_id = data.aws_caller_identity.current.account_id
}


locals {
  listeners = length(var.listeners) > 0 ? var.listeners : [
    {
      target_group_arn = aws_lb_target_group.default[0].arn
      action_type      = "forward"
      order            = 1
      port             = var.target_group.port
      protocol         = var.target_group.protocol
      certificate_arn  = null
      forward_targets = [
        {
          arn                = aws_lb_target_group.default[0].arn
          weight             = 1
          enabled_stickiness = false
          duration           = 5
        }
      ]
      rules = [

        {
          priority = 1

        }
      ]
    }
  ]
}