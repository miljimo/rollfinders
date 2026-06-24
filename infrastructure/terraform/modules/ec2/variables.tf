variable "branch_name" {
  type        = string
  description = "this is used to scope the  EC2"
}

variable "user_data" {
  type    = string
  default = null
}
variable "name" {
  type        = string
  description = "the name of the instance you want to provision"
}

variable "key_name" {
  type        = string
  description = "the key name to used to login into the instance"
  default     = null
}

variable "instance_type" {
  default = "t2.micro"
  type    = string
}

variable "username" {
  type    = string
  default = "admin"
}

variable "security_group" {
  type        = list(string)
  default     = []
  description = "list of security group Ids to be associated with the VPC"

}

variable "subnet_id" {
  type        = string
  description = "specific which subnet the ec2 should be hosted on"
}


variable "volumn_size" {
  type        = number
  default     = 12
  description = "the size of EBS to used as the primary EBS"
}
variable "delete_rebs_on_termination" {
  type    = bool
  default = true
}

variable "root_snap_id" {
  type        = string
  default     = null
  description = "the primary snapshot id that you want to create the ebs from"
}


variable "architecture" {
  default     = "x86_64"
  type        = string
  description = "the operating system archiecture to choose"
}

variable "ebs_block_devices" {
  type = list(object({
    device_name           = string
    snapshot_id           = string
    volume_size           = number
    delete_on_termination = bool
  }))

  # default primary devices to attached.
  default = []
}