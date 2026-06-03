terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "ecr" {
  source = "../../modules/ecr"
  name   = "rollfinder-prod"
}

module "secrets" {
  source = "../../modules/secrets"
  name   = "rollfinder/prod/app"
}

module "ecs" {
  source = "../../modules/ecs"
  name   = "rollfinder-prod"
}
