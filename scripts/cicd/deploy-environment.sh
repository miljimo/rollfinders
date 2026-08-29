#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export PROJECT_DIR
TERRAFORM_DIR="${TERRAFORM_DIR:-${PROJECT_DIR}/infrastructure/terraform}"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"

source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/deployment-lock.sh"

case "${ENVIRONMENT_NAME}" in
  dev|production) ;;
  *)
    echo "ENVIRONMENT_NAME must be dev or production."
    exit 1
    ;;
esac

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  if [[ "${PRODUCTION_APPROVED:-}" != "true" ]]; then
    echo "Production deploy requires PRODUCTION_APPROVED=true."
    exit 1
  fi
  if [[ "${PRODUCTION_MIGRATION_APPROVED:-}" != "true" ]]; then
    echo "Production migrations require PRODUCTION_MIGRATION_APPROVED=true."
    exit 1
  fi
fi

if [[ ! -f "${PROJECT_DIR}/image.env" ]]; then
  echo "Missing image.env artifact. Run scripts/cicd/build.sh before deployment."
  exit 1
fi

# shellcheck disable=SC1091
source "${PROJECT_DIR}/image.env"
if [[ -z "${IMAGE_URI:-}" ]]; then
  echo "image.env is missing IMAGE_URI."
  exit 1
fi

deployment_lock_acquire
export DEPLOYMENT_LOCK_HELD=true
trap deployment_lock_release EXIT

if grep -Eq '^[[:space:]]*enable_ec2_app_host[[:space:]]*=[[:space:]]*true' "${TFVARS}"; then
  "${SCRIPT_DIR}/deploy-ec2-app.sh"
else
  "${SCRIPT_DIR}/deploy.sh"
  "${SCRIPT_DIR}/migrate.sh"
fi

"${SCRIPT_DIR}/smoke.sh"
