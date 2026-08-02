variable "role_name" {
  type        = string
  description = "IAM role name assumed by GitHub Actions."
}

variable "allowed_subjects" {
  type        = list(string)
  description = "Allowed GitHub OIDC subject claims."
}

variable "managed_policy_arns" {
  type        = list(string)
  description = "Managed policies attached to the deployment role."
}

variable "max_session_duration" {
  type        = number
  description = "Maximum deployment role session duration in seconds."
  default     = 7200
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the OIDC provider and role."
  default     = {}
}
