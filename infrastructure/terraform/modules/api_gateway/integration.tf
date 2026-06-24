
resource "aws_api_gateway_integration" "integration" {
  http_method             = aws_api_gateway_method.method.http_method
  rest_api_id             = var.rest_api_id
  resource_id             = local.resource_id
  integration_http_method = "POST"
  type                    = var.integration_type
  uri                     = var.lambda_invoke_arn
  timeout_milliseconds    = 6000
  credentials             = aws_iam_role.role.arn
}


resource "aws_api_gateway_integration_response" "integration_response" {
  rest_api_id = var.rest_api_id
  http_method = aws_api_gateway_method_response.method_response.http_method
  resource_id = local.resource_id
  status_code = aws_api_gateway_method_response.method_response.status_code
  depends_on = [
    aws_api_gateway_integration.integration
  ]
}

