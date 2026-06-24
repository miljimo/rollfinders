variable "name" {
  type        = string
  description = "ECR repository name."
}

variable "keep_image_count" {
  type        = number
  description = "Number of images to keep."
  default     = 30
}
