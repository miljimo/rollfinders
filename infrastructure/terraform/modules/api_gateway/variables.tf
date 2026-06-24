
locals {
  resource_parent_id = var.resource_parent_id == "" ? aws_api_gateway_rest_api.restful_api[0].root_resource_id : var.resource_parent_id
  resource_id        = var.path != "" ? aws_api_gateway_resource.resource[0].id : var.resource_parent_id
}


variable "scope" {
  type        = string
  default     = "master"
  description = "Create a variable that will be used to scope the rest api"
}

variable "application_name" {
  type    = string
  default = "demo_application"
}

variable "api_gateway_id" {
  default     = ""
  type        = string
  description = "The api gateway ID for to be used for the integration"
}

variable "request_parameters" {
  type = map(string)
  default = {
  }
}

variable "status_code" {
  type    = number
  default = 200
}
variable "rest_api_description" {
  type    = string
  default = "no description added"
}
variable "lambda_invoke_arn" {
  type        = string
  default     = ""
  description = "The lambda function arn that the inetgrator have to invoke "
}

variable "lambda_arn" {
  type    = string
  default = ""
}

variable "role_path" {
  default     = "/"
  type        = string
  description = "Create a variable that will allow difference rource role privillages"
}


variable "http_verb" {
  type        = string
  default     = "GET"
  description = "Create a request http method type using http_verbds"
}


variable "lambda_function_name" {
  type    = string
  default = "mylambda"
}

variable "path" {
  type    = string
  default = "resource"
}

variable "resource_parent_id" {
  type    = string
  default = "resource parent id"
}

variable "rest_api_id" {
  default = ""
  type    = string
}

variable "authorization" {
  default = "CUSTOM"
  type    = string
}

variable "create_new" {
  default     = false
  type        = bool
  description = "create new variable to create a new api "
}

variable "parent" {
  type = object({
    use_parent_resource = bool
    parent_resource_id  = string
    path                = string
    rest_api_id         = string
    application_name    = string
    scope               = string
  })

  default = {
    application_name    = "app"
    scope               = "scope"
    use_parent_resource = false
    parent_resource_id  = ""
    path                = "/"
    rest_api_id         = ""
  }

  description = "Trying to create a resource objects."
}

// A default variable that will dynamic allow module
// use to set the integration request type 
// AWS , AWS_PROXY, 
variable "integration_type" {
  default = "AWS"
  type    = string
}