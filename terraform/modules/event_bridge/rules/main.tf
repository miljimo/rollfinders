# /*
 
# */

# resource "aws_cloudwatch_event_rule" "rule" {

#   for_each            = { for key, value in var.rules : key => value }
#   name                = "${var.environment_name}-${each.value.name}"
#   description         = each.value.description
#   event_bus_name      = var.event_bus_name
#   event_pattern       = each.value.has_pattern ? jsonencode(each.value.pattern) : ""
#   schedule_expression = each.value.has_pattern ? "" : each.value.pattern

#   role_arn = each.value.role_arn
#   state    = each.value.enabled ? "ENABLED" : "DISABLED"

#   tags = {
#     Name     = "${var.environment_name}-${each.value.name}"
#     EventBus = "${var.event_bus_name}"
#   }
# }


# resource "aws_cloudwatch_event_target" "target" {
#   for_each       = [for target in vars.var.targets : target]
#   target_id      = "${aws_cloudwatch_event_rule.rule.name}-${each.value.name}"
#   arn            = each.value.arn
#   event_bus_name = var.event_bus_name
#   rule           = aws_cloudwatch_event_rule.rule.arn
#   input_path     = each.value.input_path

#   dead_letter_config {
#     arn = each.value.dead_letter_arn
#   }


#   dynamic "batch_target" {
#     iterator = "item"
#     for_each = can(each.value.batch) ? [each.value.batch] : []
#     content {
#       job_name       = item.value["name"]
#       job_definition = item.value["definition"]
#       array_size     = item.value["array_size"]
#       job_attempts   = item.value["attempts"]
#     }
#   }

#   dynamic "sqs_target" {
#     iterator = "item"
#     for_each = can(each.value.sqs) ? [each.value.sqs] : []
#     content {
#       message_group_id = item.value.group_id
#     }
#   }


#   dynamic "http_target" {
#     iterator = "item"
#     for_each = can(each.value.http) ? [each.value.http] : []
#     content {
#       header_parameters       = item.value.headers
#       path_parameter_values   = item.value.path_parameters
#       query_string_parameters = item.value.string_parameters
#     }
#   }
# }