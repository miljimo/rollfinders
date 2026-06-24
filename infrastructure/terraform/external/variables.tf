##VPC variables
variable "vpc_cidr_block" {
  description = "A list of CIDR blocks for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
variable "availability_zones" {
  description = "values for the availability zones"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b"]
}


variable "container_db_service_name" {
  description = "The name of the database container service"
  type        = string
  default     = "tquest-db-service"
}

variable "environment_name" {
  description = "The environment name"
  type        = string
}


variable "db_image" {
  description = "The tag of the tQuest image to use"
  type        = string
}

variable "service_security_group_ids" {
  description = "The security group ids for the ecs service"
  type        = list(string)
}


variable "database_credential" {
  type = object({
    name            = string
    user            = optional(string, "tQuest_dataaccess")
    password        = string
    auto_restore_db = optional(bool, false)
    sa_password     = optional(string, "YourStrong!Passw0rd")
  })
  default = {
    name     = "tQuest"
    user     = "tQuest_dataaccess"
    password = "StrongP@ssw0rd!"
  }
}
