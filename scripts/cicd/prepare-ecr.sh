#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

"${SCRIPT_DIR}/bootstrap-state.sh"

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure

terraform plan \
  -target=module.ecr.aws_ecr_repository.app \
  -target=module.ecr.aws_ecr_lifecycle_policy.app \
  -var-file="${TFVARS}" \
  -var="image_uri=bootstrap-placeholder" \
  -out=ecr.tfplan

terraform apply -auto-approve ecr.tfplan
