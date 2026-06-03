variable "name" {
  type        = string
  description = "The name of the role"
}

variable "environment" {
  type        = string
  description = "The current deployment environment scope"
}

variable "assume_role_principals" {
  type = list(object({
    type = optional(string, "Service")
    identifiers : list(string)
  }))
}

variable "statements" {
  type = list(object({
    id        = optional(string, null)
    actions   = optional(list(string), [])
    effect    = optional(string, "Allow")
    resources = optional(list(string), [])
  }))
  description = "The statements variable is a list of statement policies for the attached to the roles"

  default = []
}

variable "external_policies_arn" {
  type        = list(string)
  default     = []
  description = "Import an exernal policies to be attached to the current role."
}