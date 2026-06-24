variable "name_prefix" {
  description = "Prefix for autoscaling policy names."
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name."
  type        = string
}

variable "service_name" {
  description = "ECS service name."
  type        = string
}

variable "min_capacity" {
  description = "Minimum ECS desired count."
  type        = number
}

variable "max_capacity" {
  description = "Maximum ECS desired count."
  type        = number
}

variable "cpu_target_value" {
  description = "Target ECS service average CPU percentage."
  type        = number
  default     = 70
}
