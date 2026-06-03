variable "vpc_id" {
  type        = string
  description = "The vpc that the security group belongs to"
}
variable "description" {
  type        = string
  description = "Security group description"
  default     = "Terraform deployed security group"
}

variable "name" {
  type        = string
  description = "The security group name"
}

variable "environment_name" {
  type        = string
  description = "The environment name of the security group"
}

variable "inbound_rules" {
  type = list(object({
    from            = number
    to              = number
    protocol        = string
    cidr_blocks     = optional(list(string))
    security_groups = optional(list(string), [])
    prefix_list_ids = optional(list(string), [])

  }))
  default = []
}

variable "outbound_rules" {
  type = list(object({
    from            = number
    to              = number
    protocol        = string
    cidr_blocks     = optional(list(string))
    security_groups = optional(list(string), [])
    # Prefix list ids
    prefix_list_ids = optional(list(string), [])
  }))

  default = []
}