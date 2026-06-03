#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure
APPLICATION_URL="$(terraform output -raw frontend_url)"

curl -fsS "${APPLICATION_URL}/api/health"
curl -fsS "${APPLICATION_URL}/api/health?deep=1"

echo "Application URL: ${APPLICATION_URL}"
