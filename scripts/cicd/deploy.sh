#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ "${ENVIRONMENT_NAME}" == "production" && "${PRODUCTION_APPROVED:-}" != "true" ]]; then
  echo "Production deploy requires PRODUCTION_APPROVED=true."
  exit 1
fi

cd "${TERRAFORM_DIR}"
terraform init -backend-config="${BACKEND_CONFIG}" -reconfigure

terraform apply \
  -target=aws_ecr_repository.app \
  -target=aws_ecr_lifecycle_policy.app \
  -var-file="${TFVARS}" \
  -auto-approve

cd "${PROJECT_DIR}"
"${SCRIPT_DIR}/build.sh"
source "${PROJECT_DIR}/image.env"

cd "${TERRAFORM_DIR}"
terraform apply \
  -var-file="${TFVARS}" \
  -var="container_image=${IMAGE_URI}" \
  -auto-approve

aws ecs wait services-stable \
  --region "${AWS_REGION}" \
  --cluster "$(terraform output -raw ecs_cluster_name)" \
  --services "$(terraform output -raw ecs_service_name)"

terraform output application_url
