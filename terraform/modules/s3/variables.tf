data "aws_caller_identity" "current" {}


# Local variables ; this variable are use within the modules 
locals {
  account_id  = data.aws_caller_identity.current.account_id
  unique_name = lower("${var.environment_name}-${local.account_id}-${var.name}")
}

# Configuration variables
# this variable can be used to configure what types of bucket setting you wants.
# The default configuration will be the best we assume at the points of this bucket module design 


variable "environment_name" {
  type        = string
  description = "This is the environment where the bucket will be deploy e.g git branch name"
}

variable "name" {
  type        = string
  description = "the bucket name"
}

# variable "storage_class"{
#   type  = string

#   validation {
#      condition = conatins(["GLACIER","STANDARD_IA","ONEZONE_IA", "INTELLIGENT_TIERING", "DEEP_ARCHIVE", "GLACIER_IR"], var.storage_class)
#      error_message = "specific a value s3 storage class"
#   }  

#   default = "GLACIER" 
# }

variable "use_actual_name" {
  type    = bool
  default = false
}


variable "acl" {
  default = "public-read"
  type    = string
  validation {
    condition = contains(["private",
      "public-read",
      "public-read-write",
      "aws-exec-read",
      "authenticated-read",
      "bucket-owner-read",
      "bucket-owner-full-control",
    "log-delivery-write"], var.acl)
    error_message = "invalid acl value provided, expecting 'private'"
  }
}

variable "mfa_delete_status" {
  type        = bool
  default     = false
  description = "MFA deleted status enabled for users to required MFA to be able to delete bucket object"
}


#  The variables is used to configured cors_rules on the bucket
variable "cors_rules" {
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = []
}


# The variable will be used to hold an enum of the versioning status for the bucket
# Disabled or Suspended means that the bucket will not allow 
# object version otherwise it would.
variable "enabled_versioning" {
  type        = bool
  default     = false
  description = "Enabled or Disabled will be only the versioning status"

}

variable "force_deletion" {
  type        = bool
  default     = true
  description = "force the deletion of all objects when the bucket is destroyed."
}
variable "lock_enabled" {
  type        = bool
  default     = false
  description = "lock the objects in the s3"
}

variable "create_before_destroy" {
  type        = bool
  default     = false
  description = "force terraform to create before it destroy the old resources."
}
# Amazon Life cycle configurations parameters
variable "life_cycle_rules" {
  type = list(object({
    status      = bool
    expire_date = optional(string)
    expire_days = optional(number)
    # the location of the s3 the role should applied to.
    prefix                   = optional(string)
    object_size_greater_than = optional(number)
    object_size_less_than    = optional(number)

    # Use the an operator to add additional filters
    and_additional = optional(list(object({
      prefix                   = string
      object_size_greater_than = optional(number)
      object_size_less_than    = optional(number)
    })), [])

    #Transition
    transitions = optional(list(object({
      days = optional(number)
      date = optional(string)
      # https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
      storage_class = string
    })), [])
    tags = optional(map(string), {})
  }))

  default = []
}

variable "server_logging_configuration" {
  type = object({
    # the arn for the bucket to log the server activities of the bucket into
    target_bucket_arn = string
    target_prefix     = string
  })

  default = { target_bucket_arn = null
  target_prefix = null }
}

# Object location configuration variables
variable "locking_configuration" {
  type = object({
    token   = optional(string, null)
    enabled = bool
    retentions = list(object({
      mode  = string
      years = optional(number, null)
      days  = optional(number, null)
    }))
  })

  default = {
    token      = null
    enabled    = false
    retentions = []
  }

  # validate the retention mode , and treat it as enum
  #can(index(["COMPLIANCE", "GOVERNANCE"], var.locking_configuration.retention.mode))
  validation {
    condition     = alltrue([for key, value in var.locking_configuration.retentions : contains(["COMPLIANCE", "GOVERNANCE"], value.mode)])
    error_message = "locking retention mode must be either COMPLIANCE, GOVERNANCE as value"
  }

  validation {
    condition     = alltrue([for key, value in var.locking_configuration.retentions : can(value.years != null && value.days != null)])
    error_message = "You can't not specific both years and days at the same time for locking retention period"
  }
}

# To replicate the bucket object accross account, region or zones
variable "replication" {
  type = object({
    role_arn  = string
    enabled   = bool
    bucket_id = string
  })
  default = {
    role_arn  = null
    enabled   = false
    bucket_id = null
  }
}

variable "payer" {
  type    = string
  default = "BucketOwner"

  validation {
    condition     = can(contains(["BucketOwner", "Requester"], var.payer))
    error_message = "bucket's payer field must be either BucketOwner or Requester"
  }
}

// specifc the index document where the S3 will server.
variable "index_document" {
  type    = string
  default = null
}

variable "error_document" {
  type    = string
  default = null
}
// specific the url where you want all the traffic to be route to
variable "redirect_all" {
  type    = string
  default = null
}

variable "use_eventbridge" {
  description = "true will enable the s3 to used event bridge for notifications"
  type        = bool
  default     = false
}
variable "event_targets" {
  type = list(object({
    name       = string
    type       = string
    target_arn = string
    events     = list(string)
    #object key name suffix and prefix filtering
    filter_prefix = optional(string)
    filter_suffix = optional(string)
  }))

  validation {
    condition     = alltrue([for key, value in var.event_targets : contains(["SQS", "SNS", "LAMBDA"], value.type)])
    error_message = "events_target type is invalid"
  }
  default = []
}

variable "sse_algorithm" {
  type    = string
  default = "AES256"
  validation {
    condition     = contains(["AES256", "aws:kms", "aws:kms:dsse", "aws:kms"], var.sse_algorithm)
    error_message = "invalid sse_algorithm specific"
  }
}

variable "kms_key_id" {
  type        = string
  description = "Its a good practices to keep your S3 bucket encryped from the server side."
  default     = null
}

variable "policy_statements" {
  type = list(object({
    id          = optional(string)
    action_type = string
    actions     = list(string)
    type        = optional(string)
    principals  = list(string)
    paths       = optional(list(string))
  }))

  validation {
    condition = alltrue(
      [for item in var.policy_statements : contains(["Deny", "Allow"], item.action_type)]
    )
    error_message = "invalid policy action type, expecting Allow or Deny"
  }

  default = []
}

variable "merge_policy_documents" {
  type    = list(string)
  default = []
}


variable "public_access" {
  default = { block_public_acls = true,
    block_public_policy     = true,
    ignore_public_acls      = true,
    restrict_public_buckets = true
  }

  type = object({
    block_public_acls       = optional(bool)
    block_public_policy     = optional(bool)
    ignore_public_acls      = optional(bool)
    restrict_public_buckets = optional(bool)
  })
}