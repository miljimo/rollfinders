/*
   S3 Notification can be configured to monitored events that happen within a bucket.
   This events includes:
    Amazon S3 can publish notifications for the following events:
    - New object created events
    - Object removal events
    - Restore object events
    - Reduced Redundancy Storage (RRS) object lost events
    - Replication events
    - S3 Lifecycle expiration events
    - S3 Lifecycle transition events
    - S3 Intelligent-Tiering automatic archival events
    - Object tagging events
    - Object ACL PUT events 

    Targets : AWS S3 Bucket can send events to the following AWS resources.
    - Amazon Simple Notification Service (Amazon SNS) topics (one to Many)
    - Amazon Simple Queue Service (Amazon SQS) queues (One to One)
    - AWS Lambda function
    - Amazon EventBridge ( Many to Many)
   See the following for more information : https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
*/


# Configured lambda notifications to the S3 Bucket
resource "aws_s3_bucket_notification" "lambda_notification" {
  count       = (length(var.event_targets) > 0) || var.use_eventbridge ? 1 : 0
  bucket      = aws_s3_bucket.bucket.id
  eventbridge = var.use_eventbridge

  # I normal discourage uses notification directly to a target.
  # configured queue events notifications
  # [S3-> SQS]
  dynamic "queue" {
    for_each = { for key, value in var.event_targets : key => value if value.type == "SQS" }
    content {
      id            = lookup(lambda_function.value, "name")
      queue_arn     = lookup(lambda_function.value, "target_arn")
      events        = lookup(lambda_function.value, "events", [])
      filter_prefix = lookup(lambda_function.value, "filter_prefix")
      filter_suffix = lookup(lambda_function.value, "filter_suffix")
    }
  }

  #trigger lambdas [S3->LambdaFunc()]
  dynamic "lambda_function" {
    for_each = { for key, value in var.event_targets : key => value if value.type == "LAMBDA" }
    content {
      id                  = lookup(lambda_function.value, "name")
      lambda_function_arn = lookup(lambda_function.value, "target_arn")
      events              = lookup(lambda_function.value, "events", [])
      filter_prefix       = lookup(lambda_function.value, "filter_prefix")
      filter_suffix       = lookup(lambda_function.value, "filter_suffix")
    }
  }

  # SNS notification configurations [S3->SNS]
  # 1 to many message services
  dynamic "topic" {
    for_each = { for key, value in var.event_targets : key => value if value.type == "SNS" }
    content {
      id            = lookup(lambda_function.value, "name")
      topic_arn     = lookup(lambda_function.value, "target_arn")
      events        = lookup(lambda_function.value, "events", [])
      filter_prefix = lookup(lambda_function.value, "filter_prefix")
      filter_suffix = lookup(lambda_function.value, "filter_suffix")
    }
  }
  depends_on = [aws_s3_bucket.bucket]
}
