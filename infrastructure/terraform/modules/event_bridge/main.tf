

resource "aws_cloudwatch_event_bus" "event_bus" {
  name              = local.fullname
  event_source_name = var.source_name
  tags = {
    Name = local.fullname
  }
}
