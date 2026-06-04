#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-rollfinder}"
AWS_REGION="${AWS_REGION:-eu-west-2}"

terraform_backend_bucket() {
  local account_id="${AWS_ACCOUNT_ID:-}"

  if [[ -z "${account_id}" ]]; then
    account_id="$(aws sts get-caller-identity --query Account --output text)"
  fi

  # Mirrors terraform/modules/s3 local.unique_name for bootstrap's artefact bucket.
  echo "${APP_NAME}-${account_id}-terraform-artefact"
}

terraform_backend_key() {
  local environment_name="$1"
  echo "${environment_name}/terraform.tfstate"
}

terraform_backend_args() {
  local environment_name="$1"
  local backend_config_file="$2"

  BACKEND_BUCKET="$(terraform_backend_bucket)"
  BACKEND_KEY="$(terraform_backend_key "${environment_name}")"
  BACKEND_CONFIG_ARGS=(
    -backend-config="${backend_config_file}"
    -backend-config="bucket=${BACKEND_BUCKET}"
    -backend-config="key=${BACKEND_KEY}"
    -backend-config="region=${AWS_REGION}"
  )

  export BACKEND_BUCKET BACKEND_KEY
}
