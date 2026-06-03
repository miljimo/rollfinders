/*
 Create the method request from the client to the integration request lambda function.
*/
resource "aws_api_gateway_method" "method" {
  rest_api_id        = var.rest_api_id
  http_method        = var.http_verb
  resource_id        = local.resource_id
  authorization      = var.authorization
  authorizer_id      = aws_api_gateway_authorizer.authorizer.id
  request_parameters = var.request_parameters
  #  operation_name = "${var.http_verb}-${var.lambda_function_name}"
}


resource "aws_api_gateway_method_response" "method_response" {
  rest_api_id = var.rest_api_id
  resource_id = local.resource_id
  http_method = aws_api_gateway_method.method.http_method
  status_code = var.status_code
}

