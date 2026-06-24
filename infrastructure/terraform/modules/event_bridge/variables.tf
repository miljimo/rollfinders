
variable "environment_name" {
  type        = string
  description = "the environment where the event_bus should be deploy to"
}

variable "name" {
  type        = string
  description = "the name of the event-bus"
}

variable "source_name" {
  type        = string
  description = "The Partner event source that the new event bus will be matched with, must match name"
  default     = null
}

