terraform {
  required_version = ">=1.8.2"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=5"
    }
    random = {
      source  = "hashicorp/random"
      version = ">=3.6"
    }
  }

  backend "s3" {
    key     = "rollfinder/tfstate.json"
    region  = "eu-west-2"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
