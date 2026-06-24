variable "name" {
  description = "SSM parameter path prefix."
  type        = string
}

variable "secret_values" {
  description = "Application configuration and secret key/value pairs."
  type        = map(string)
  sensitive   = true
}

variable "secure_value_keys" {
  description = "Keys that must be stored as SecureString parameters. Other keys are stored as String parameters."
  type        = set(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to the secret."
  type        = map(string)
  default     = {}
}
