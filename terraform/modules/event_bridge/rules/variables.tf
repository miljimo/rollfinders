variable "environment_name" {
  type        = string
  description = "the environment where the event_bus should be deploy to"
}

variable "name" {
  type        = string
  description = "the name of the event-bus"
}

variable "event_bus_name" {
  type        = string
  description = "The name of the event bus that this rule will be registered to"
  default     = "default"
}

variable "targets" {

  type = list(object({
    name            = string
    arn             = string
    role_arn        = string
    dead_letter_arn = optional(string, null)

    batch = optional(object({
      name       = string
      definition = string
      array_size = optional(number, null)
      attempts   = optional(number, 1)

    }), null)

    sqs = optional(object({
      group_id = string
    }), null)

    http = optional(object({
      headers           = optional(map(string), null)
      path_parameters   = optional(list(string), null)
      string_parameters = optional(map(string), null)

    }), null)

    }
  ))


  default = []

}


variable "rules"{
  type  = list(object({

  }))

  default = []
}