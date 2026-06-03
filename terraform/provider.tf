terraform {
  required_version = ">=1.4.6"
  required_providers {
    aws = {
      version = ">=5"
    }
  }
  backend "s3" {
    key                  = "tquest/tfstate.json"
    region               = "eu-west-2"
    workspace_key_prefix = "workspaces"
    encrypt              = true
    use_lockfile         = true
  }
}

provider "aws" {
  region = "eu-west-2"
}

