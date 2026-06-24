/*
   Bucket policy configurations
*/

data "aws_iam_policy_document" "policy_document" {
  count                     = length(var.policy_statements) > 0 ? 1 : 0
  policy_id                 = "${var.environment_name}-${var.name}-policy-document"
  override_policy_documents = var.merge_policy_documents

  dynamic "statement" {
    for_each = var.policy_statements
    content {
      sid    = coalesce(lookup(statement.value, "id"), "${var.name}-${statement.key}")
      effect = lookup(statement.value, "action_type", "Allow")
      principals {
        type        = coalesce(lookup(statement.value, "type"), "AWS")
        identifiers = lookup(statement.value, "principals")
      }
      actions = lookup(statement.value, "actions")
      resources = [
        # lookup in a optional fields will return null , for that reason we 
        # have to use coalesce to return the first non null object in the varadiac parameters.
        for item in coalesce(lookup(statement.value, "paths"), []) : "${aws_s3_bucket.bucket.arn}/${item}"
      ]

    }
  }
}

# Creating the bucket policy
resource "aws_s3_bucket_policy" "policy" {
  count  = length(var.policy_statements) > 0 ? 1 : 0
  bucket = aws_s3_bucket.bucket.id
  policy = data.aws_iam_policy_document.policy_document[0].json
}