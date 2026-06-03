
variable "environment" {
  type = string
}

variable "name" {
  type        = string
  description = "the name of the ecs cluster"
}

variable "launch_type" {
  type    = string
  default = "FARGATE"
  validation {
    condition     = can(contains(["FARGATE", "EC2", "EXTERNAL"], var.launch_type))
    error_message = "Invalid launch type provided, expecting FARGATE, EC2 or EXTERNAL"
  }
}
variable "cpu" {
  type        = number
  default     = 1024
  description = "The number of CPU units for the container"
}

variable "memory" {
  type        = number
  default     = 2048
  description = "The number of memory for the whole container"
}
variable "task_definitions" {
  type = list(object({
    name       = string
    image      = string
    cpu        = optional(number, 1) # Number of the CPU to reserve for this task
    memory     = optional(number, 512)
    essential  = optional(bool, true)
    command    = optional(list(string), null)
    log_region = optional(string, "eu-west-2")
    environments = optional(list(object({
      name  = string
      value = string
    })), null)
    ports = optional(list(object({
      container_port = optional(number, 80)
      host_port      = optional(number, 80)
      protocol       = optional(string, "tcp")
    })), [])

    healthCheck = optional(object({
      command     = list(string)
      interval    = optional(number, 30)
      timeout     = optional(number, 5)
      retries     = optional(number, 3)
      startPeriod = optional(number, 10)
      }), {
      # Default for the health check if not priovided
      command     = ["CMD-SHELL", "curl -f http://localhost/health/check.php || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    })
  }))

  default = []
}

variable "task_role_arn" {
  type        = string
  description = "the role that the task can assume to make AWS API calls to other AWS services."
  default     = null
}

variable "desired_count" {
  type        = string
  description = "desire count"
  default     = 1
}

variable "assign_public_ip" {
  type        = bool
  description = "true to assigned ip otherwise false"
  default     = false
}

variable "security_groups" {
  type        = list(string)
  description = "list of security groups that the ecs instance have to use."
  default     = []
}

variable "subnets" {
  type        = list(string)
  description = "list of security groups that the ecs instance have to use."
  default     = []
}


variable "load_balancer" {
  type = object({
    name             = optional(string, null) # for classic load balancer
    target_group_arn = optional(string, null) # for application load balancer
    container_name   = string
    container_port   = optional(number, 80)
  })

  # validation {
  #   condition     = (var.load_balancer != null) && (var.load_balancer.name != null || var.load_balancer.target_group_arn != null)
  #   error_message = "Either name or target_group_arn or load_balancer_name must be provided in the load_balancer object"
  # }

  default = null
}


variable "enable_service_discovery" {
  type        = bool
  description = "true to enable service discovery otherwise false"
  default     = false
}

variable "vpc_id" {
  type        = string
  description = "the vpc id where the service will be deployed"
  default     = null
}

variable "use_default_task_role" {
  type        = bool
  description = "true to create and use a default task role otherwise false"
  default     = false
}