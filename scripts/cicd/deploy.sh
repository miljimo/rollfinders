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

terraform plan \
  -target=aws_ecr_repository.app \
  -target=aws_ecr_lifecycle_policy.app \
  -var-file="${TFVARS}" \
  -out=ecr.tfplan

terraform apply \
  -auto-approve \
  ecr.tfplan

cd "${PROJECT_DIR}"
"${SCRIPT_DIR}/build.sh"
source "${PROJECT_DIR}/image.env"

cd "${TERRAFORM_DIR}"
terraform plan \
  -var-file="${TFVARS}" \
  -var="container_image=${IMAGE_URI}" \
  -out=deploy.tfplan

terraform apply \
  -auto-approve \
  deploy.tfplan

aws ecs wait services-stable \
  --region "${AWS_REGION}" \
  --cluster "$(terraform output -raw ecs_cluster_name)" \
  --services "$(terraform output -raw ecs_service_name)"

FRONTEND_URL="$(terraform output -raw frontend_url)"
WWW_URL="$(terraform output -raw www_url)"
API_URL="$(terraform output -raw api_url)"
CERTIFICATE_ARN="$(terraform output -raw certificate_arn)"

cat <<EOF
================================================

Deployment Successful

Environment:
${ENVIRONMENT_NAME}

Frontend URL:
${FRONTEND_URL}

WWW URL:
${WWW_URL}

API URL:
${API_URL}

Certificate ARN:
${CERTIFICATE_ARN}

================================================
EOF
