#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export PROJECT_DIR
TERRAFORM_DIR="${TERRAFORM_DIR:-${PROJECT_DIR}/infrastructure/terraform}"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
source "${SCRIPT_DIR}/deployment-lock.sh"
source "${SCRIPT_DIR}/promotion.sh"
source "${SCRIPT_DIR}/super-admin-env.sh"

case "${ENVIRONMENT_NAME}" in
  dev|production) ;;
  *)
    echo "ENVIRONMENT_NAME must be dev or production."
    exit 1
    ;;
esac

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  echo "production direct deployment enabled; using image.env artifact."
elif [[ "${ENVIRONMENT_NAME}" != "dev" && "${ALLOW_DIRECT_ENV_DEPLOY:-}" == "true" ]]; then
  echo "${ENVIRONMENT_NAME} direct deployment override enabled; using image.env artifact."
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

if [[ -z "${IMAGE_URI:-}" ]]; then
  echo "image.env is missing IMAGE_URI. Run scripts/cicd/build.sh before environment deploy."
  exit 1
fi

if [[ -z "${API_SERVICE_IMAGE_URI:-}" || -z "${USER_SERVICE_IMAGE_URI:-}" || -z "${PAYMENT_SERVICE_IMAGE_URI:-}" || -z "${AUTHORISATION_SERVICE_IMAGE_URI:-}" || -z "${SUBSCRIPTION_SERVICE_IMAGE_URI:-}" ]]; then
  echo "image.env must include API_SERVICE_IMAGE_URI, USER_SERVICE_IMAGE_URI, PAYMENT_SERVICE_IMAGE_URI, AUTHORISATION_SERVICE_IMAGE_URI, and SUBSCRIPTION_SERVICE_IMAGE_URI for this release."
  echo "Run scripts/cicd/build-go-services.sh after scripts/cicd/build.sh, or set FORCE_SERVICE_REDEPLOY=true SERVICE_REDEPLOY_TARGET=all."
  exit 1
fi

preserve_existing_secret_var() {
  local tf_var_name="$1"
  local parameter_name="$2"

  if [[ -n "${!tf_var_name:-}" ]]; then
    return 0
  fi

  local value
  if value="$(aws ssm get-parameter --region "${AWS_REGION:-eu-west-2}" --name "${parameter_name}" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)"; then
    if [[ -n "${value}" && "${value}" != "__UNSET__" ]]; then
      export "${tf_var_name}=${value}"
    fi
  fi
}

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  preserve_existing_secret_var "TF_VAR_payment_gateway_api_key" "/rollfinder-production/app/PAYMENT_GATEWAY_API_KEY"
  preserve_existing_secret_var "TF_VAR_stripe_context" "/rollfinder-production/app/STRIPE_CONTEXT"
fi

"${SCRIPT_DIR}/bootstrap-state.sh"

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure
terraform plan \
  -var-file="${TFVARS}" \
  -var="image_uri=${IMAGE_URI}" \
  -var="user_service_image_uri=${USER_SERVICE_IMAGE_URI:-}" \
  -var="payment_service_image_uri=${PAYMENT_SERVICE_IMAGE_URI:-}" \
  -out=deploy.tfplan

terraform apply \
  -auto-approve \
  deploy.tfplan

"${SCRIPT_DIR}/migrate.sh"
"${SCRIPT_DIR}/deploy.sh"
"${SCRIPT_DIR}/ensure-super-admin.sh"

if [[ "${ENVIRONMENT_NAME}" == "dev" ]]; then
  "${SCRIPT_DIR}/seed.sh"
fi

"${SCRIPT_DIR}/smoke.sh"
promotion_write "${ENVIRONMENT_NAME}" success
