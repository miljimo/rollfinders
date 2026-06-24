
resource "aws_api_gateway_authorizer" "authorizer" {
  name                             = "${var.scope}-${aws_iam_role.role.name}-authorizer"
  rest_api_id                      = var.rest_api_id
  authorizer_uri                   = var.lambda_invoke_arn
  authorizer_credentials           = aws_iam_role.role.arn
  type                             = "REQUEST"
  identity_source                  = "method.request.header.cookie"
  authorizer_result_ttl_in_seconds = 0
}
