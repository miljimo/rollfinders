variable "environment" {
  type        = string
  description = "the scope branch , this would allow multi-environment deployment"
}

variable "name" {
  type        = string
  description = "the name of the load balancer"
}
variable "logs_bucket_name" {
  type        = string
  default     = null
  description = "use for connection and server logs"
}

variable "log_prefix" {
  type    = string
  default = null
}


variable "internal" {
  default     = true
  type        = bool
  description = "if true the load balancer would be internal"
}
variable "type" {
  type    = string
  default = "application"
  validation {
    condition     = contains(["application", "network", "gateway"], var.type)
    error_message = "load balancer types must be either application or network"
  }
}

variable "enabled_deletion_production" {
  type        = bool
  default     = false
  description = "allow terraform delete the load balance"
}

variable "security_group_ids" {
  type        = list(string)
  description = "provide atleast one security group id"
}
variable "subnet_ids" {
  type        = list(string)
  description = "At least two subjects in different zone is needed"
}


variable "listeners" {
  type = list(object({
    target_group_arn = string
    action_type      = string
    order            = number # number from 0 - 50000 order for executions
    port             = number # the port the listener would have to listen on.
    protocol         = optional(string)
    # Certificate arn for the https listeners
    certificate_arn = optional(string)
    # forward to other targets as the default settings for the listeners
    # for action_type = "forward"
    forward_targets = optional(list(object({
      arn                = string
      weight             = number # range is 0 to 999.
      duration           = number # 1-604800 seconds (7 days).
      enabled_stickiness = bool
    })))

    rules = optional(list(object({
      priority = number

    })))

  }))

  validation {
    condition = alltrue([
      for item in var.listeners : contains(["forward",
        "redirect",
        "fixed-response", # (Optional) Information for creating an action that returns a custom HTTP response
        "authenticate-cognito",
        "authenticate-oidc"],
      item.action_type)
    ])
    error_message = "the listener action type"
  }

  validation {
    condition = alltrue([
      for item in var.listeners : contains(["HTTP", "HTTPS"], coalesce(item.protocol, "HTTP"))
    ])
    error_message = "protocol must either be HTTP or HTTPS only"
  }

  default = []
}

variable "subnet_mappings" {
  type = list(object({
    id            = string # subnet id
    allocation_id = optional(string)
  }))

  default = []
}

variable "web_acl_id" {
  type        = string
  description = "Security on the elastic balancer to have a WAP configured"
  default     = null
}


variable "default_group_enabled" {
  type        = bool
  description = "create a default target group for the load balancer"
  default     = false
}

variable "vpc_id" {
  type        = string
  description = "The VPC id for the default "
  default     = null
}


// Default target group settings
// this would be used if default_group_enabled is set to true
variable "target_group" {
  type = object({
    name     = string
    type     = optional(string, "ip") # instance, ip, lambda
    vpc_id   = optional(string)
    port     = optional(number, 80)     # the port the target group would listen on
    protocol = optional(string, "HTTP") # HTTP, HTTPS, TCP, TLS, UDP, TCP_UDP 

    health_check = object({
      path     = string
      port     = optional(number, 80)
      protocol = optional(string, "HTTP") # HTTP, HTTPS, TCP, TLS, UDP, TCP_UDP
    })
  })

  default = {
    name   = "default-tg"
    vpc_id = null
    health_check = {
      path = "/"
    }
  }
}


variable "internet_gateway_id" {
  type        = string
  description = "The internet gateway id to attach to the VPC"
  default     = null
}

variable "attach_internet_gateway" {
  type        = bool
  description = "if true the module would attach the internet gateway to the VPC"
  default     = false
}