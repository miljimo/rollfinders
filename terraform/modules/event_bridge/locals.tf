locals {
  fullname = "${var.environment_name}-${var.name}"
}


variable "rules" {
  type = list(object({
    enabled     = optional(bool, true)
    name        = string
    description = optional(string)
    has_pattern = optional(bool, true)
    pattern     = any
    role_arn    = string
  }))

  description = "the rules for the event bus"
  default     = []
}