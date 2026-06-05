#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export PROJECT_DIR
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
source "${SCRIPT_DIR}/deployment-lock.sh"
source "${SCRIPT_DIR}/promotion.sh"
source "${SCRIPT_DIR}/super-admin-env.sh"

case "${ENVIRONMENT_NAME}" in
  dev|staging|production) ;;
  *)
    echo "ENVIRONMENT_NAME must be dev, staging, or production."
    exit 1
    ;;
esac

if [[ "${ENVIRONMENT_NAME}" == "staging" ]]; then
  promotion_require dev staging
elif [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  promotion_require staging production
fi

deployment_lock_acquire
export DEPLOYMENT_LOCK_HELD=true
trap deployment_lock_release EXIT

if [[ "${ENVIRONMENT_NAME}" != "dev" ]]; then
  export PROMOTION_DEPLOYMENT=true
fi

if [[ ! -f "${PROJECT_DIR}/image.env" ]]; then
  echo "Missing image.env artifact. Run scripts/cicd/build.sh before environment deploy."
  exit 1
fi

source "${PROJECT_DIR}/image.env"

"${SCRIPT_DIR}/bootstrap-state.sh"

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure
terraform plan \
  -var-file="${TFVARS}" \
  -var="image_uri=${IMAGE_URI}" \
  -out=deploy.tfplan

terraform apply \
  -auto-approve \
  deploy.tfplan

"${SCRIPT_DIR}/deploy.sh"
"${SCRIPT_DIR}/migrate.sh"
"${SCRIPT_DIR}/ensure-super-admin.sh"

if [[ "${ENVIRONMENT_NAME}" == "dev" ]]; then
  "${SCRIPT_DIR}/seed.sh"
fi

"${SCRIPT_DIR}/smoke.sh"
promotion_write "${ENVIRONMENT_NAME}" success
