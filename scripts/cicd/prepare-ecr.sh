#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

"${SCRIPT_DIR}/bootstrap-state.sh"

cd "${TERRAFORM_DIR}"
terraform init -backend-config="${BACKEND_CONFIG}" -reconfigure

terraform plan \
  -target=aws_ecr_repository.app \
  -target=aws_ecr_lifecycle_policy.app \
  -var-file="${TFVARS}" \
  -var="image_uri=bootstrap-placeholder" \
  -out=ecr.tfplan

terraform apply -auto-approve ecr.tfplan
