/*
  Visits https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies_id-based to learn about roles and policy.
  role has 1 or more permissions
*/

resource "aws_iam_role" "role" {
  name_prefix = "${var.scope}-api-gateway-role"
  path        = var.role_path
  tags = {
    environment_name = var.scope
  }

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        //The Action element describes the specific action or actions that will be allowed or denied
        Action = "sts:AssumeRole"
        Effect = "Allow" // means allow access while Deny means deny access
        // Use the Principal element in a resource-based JSON policy to
        // specify the principal that is allowed or denied access to a resource.
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}


# create the iam role policy that the api gateway will use to invoke the lambda function
resource "aws_iam_role_policy" "authorizer_policy" {
  name = "${var.scope}-${aws_iam_role.role.id}-api-gateway-authorizer_policy"
  role = aws_iam_role.role.id

  # Cloudformation iam permission policy template here
  // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # list of actions that we want the api gateway to perform on the lambda function
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect = "Allow"
        // IAM permissions policy resources to which the Action apply to.
        Resource = "${var.lambda_arn}"
      }
    ]
  })
}