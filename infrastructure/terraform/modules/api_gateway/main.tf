/*
 The main file for the API gateway settings

*/

resource "aws_api_gateway_resource" "resource" {
  count       = var.path != "" ? 1 : 0
  rest_api_id = var.rest_api_id
  parent_id   = var.resource_parent_id
  path_part   = var.path
}