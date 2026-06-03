variable "name" {
  description = "Secrets Manager secret name."
  type        = string
}

variable "secret_values" {
  description = "Application secret key/value pairs."
  type        = map(string)
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to the secret."
  type        = map(string)
  default     = {}
}
