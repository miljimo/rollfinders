# module "access_log_bucket" {
#   source      = "../../"
#   environment = var.environment
#   name        = "alb-access-logs"
#   acl         = "log-delivery-write"
#   versioning  = false
#   lifecycle_rules = [
#     {
#       id      = "log-expiration"
#       enabled = true
#       expiration = {
#         days = 30
#       }
#       noncurrent_version_expiration = {
#         days = 30
#       }
#       prefix = "AWSLogs/${var.account_id}/elasticloadbalancing/${var.region}/"
#     }
#   ]
# }