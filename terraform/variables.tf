variable "environment_name" {
  type        = string
  description = "the environment variable for the deployments"
}
variable "feature_branch" {
  type        = bool
  description = "Is this a feature branch deployment?"
  default     = true
}
variable "availability_zones" {
  type    = list(string)
  default = ["eu-west-2a", "eu-west-2b"]
}

variable "container_service_name" {
  type        = string
  description = "the name of the ecs cluster"
}

variable "container_db_service_name" {
  type        = string
  description = "The name of the db ecs cluster"
  default     = "tquestdb"
}
