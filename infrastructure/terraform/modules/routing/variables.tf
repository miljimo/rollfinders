
variable "name" {
  type = string
}
variable "branch_name" {
  type        = string
  description = "the branch name of the application to create the sense of scoping/workspaces"
}

variable "hosted_zone_id" {
  type        = string
  description = "the hosted zone id"
}

variable "records" {
  type = list(object({
    type   = string
    name   = string
    ttl    = number
    values = optional(list(string))

  }))
  description = "The records to created"
  default     = []
}

