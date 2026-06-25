#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"

cd "${PROJECT_DIR}"

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
IMAGE_TAG="${IMAGE_TAG:-${BITBUCKET_COMMIT:-$(git rev-parse --short HEAD)}}"
FORCE_SERVICE_REDEPLOY="${FORCE_SERVICE_REDEPLOY:-false}"
SERVICE_REDEPLOY_TARGET="${SERVICE_REDEPLOY_TARGET:-all}"
IMAGE_ENV_FILE="${IMAGE_ENV_FILE:-image.env}"

touch "${IMAGE_ENV_FILE}"
TMP_IMAGE_ENV="$(mktemp)"
grep -v -E '^(API_SERVICE_IMAGE_URI|USER_SERVICE_IMAGE_URI|PAYMENT_SERVICE_IMAGE_URI|AUTHORISATION_SERVICE_IMAGE_URI|SUBSCRIPTION_SERVICE_IMAGE_URI)=' "${IMAGE_ENV_FILE}" >"${TMP_IMAGE_ENV}" || true
mv "${TMP_IMAGE_ENV}" "${IMAGE_ENV_FILE}"

service_changed() {
  local path

  if [[ "${FORCE_SERVICE_REDEPLOY}" == "true" ]]; then
    return 0
  fi

  for path in "$@"; do
    if [[ -n "${BITBUCKET_COMMIT:-}" ]]; then
      if git rev-parse "${BITBUCKET_COMMIT}^" >/dev/null 2>&1; then
        git diff --quiet "${BITBUCKET_COMMIT}^" "${BITBUCKET_COMMIT}" -- "${path}" || return 0
        continue
      fi
    fi

    if git rev-parse HEAD^ >/dev/null 2>&1; then
      git diff --quiet HEAD^ HEAD -- "${path}" || return 0
      continue
    fi

    echo "Unable to determine changed paths; treating ${path} as changed."
    return 0
  done

  return 1
}

target_matches() {
  local service="$1"
  [[ "${SERVICE_REDEPLOY_TARGET}" == "all" || -z "${SERVICE_REDEPLOY_TARGET}" || "${SERVICE_REDEPLOY_TARGET}" == "${service}" ]]
}

build_service() {
  local service="$1"
  local dockerfile="$2"
  local env_var="$3"
  local repository="rollfinder/${ENVIRONMENT_NAME}/${service}"
  local registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  local image_uri="${registry}/${repository}"

  if [[ ! -f "${dockerfile}" ]]; then
    echo "Skipping ${service} image build; ${dockerfile} does not exist in this checkout."
    return 0
  fi

  aws ecr describe-repositories --region "${AWS_REGION}" --repository-names "${repository}" >/dev/null 2>&1 \
    || aws ecr create-repository --region "${AWS_REGION}" --repository-name "${repository}" >/dev/null

  docker build \
    -f "${dockerfile}" \
    -t "${image_uri}:${IMAGE_TAG}" \
    -t "${image_uri}:latest" \
    -t "${image_uri}:${ENVIRONMENT_NAME}" \
    .

  docker push "${image_uri}:${IMAGE_TAG}"
  docker push "${image_uri}:latest"
  docker push "${image_uri}:${ENVIRONMENT_NAME}"

  printf '%s=%s\n' "${env_var}" "${image_uri}:${IMAGE_TAG}" >> "${IMAGE_ENV_FILE}"
  echo "Built ${service}: ${image_uri}:${IMAGE_TAG}"
}

emit_existing_service_image() {
  local service="$1"
  local env_var="$2"
  local repository="rollfinder/${ENVIRONMENT_NAME}/${service}"
  local registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  local image_uri="${registry}/${repository}:${ENVIRONMENT_NAME}"

  printf '%s=%s\n' "${env_var}" "${image_uri}" >> "${IMAGE_ENV_FILE}"
  echo "Reusing ${service}: ${image_uri}"
}

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

if target_matches "api" && service_changed "apps/backend_api/containers/api" "apps/backend_api/cmd/api" "apps/backend_api/internal/services/api" "apps/backend_api/internal/core/routes"; then
  build_service "api" "apps/backend_api/containers/api/Dockerfile" "API_SERVICE_IMAGE_URI"
else
  emit_existing_service_image "api" "API_SERVICE_IMAGE_URI"
fi

if target_matches "users" && service_changed "apps/backend_api/containers/users" "apps/backend_api/cmd/services/users" "apps/backend_api/internal/services/users"; then
  build_service "users" "apps/backend_api/containers/users/Dockerfile" "USER_SERVICE_IMAGE_URI"
else
  emit_existing_service_image "users" "USER_SERVICE_IMAGE_URI"
fi

if target_matches "payments" && service_changed "apps/backend_api/containers/payments" "apps/backend_api/cmd/services/payments" "apps/backend_api/internal/services/payments"; then
  build_service "payments" "apps/backend_api/containers/payments/Dockerfile" "PAYMENT_SERVICE_IMAGE_URI"
else
  emit_existing_service_image "payments" "PAYMENT_SERVICE_IMAGE_URI"
fi

if target_matches "authorisation" && service_changed "apps/backend_api/containers/authorisation" "apps/backend_api/cmd/services/authorisation" "apps/backend_api/internal/services/authorisation" "apps/backend_api/migrations/authorisation"; then
  build_service "authorisation" "apps/backend_api/containers/authorisation/Dockerfile" "AUTHORISATION_SERVICE_IMAGE_URI"
else
  emit_existing_service_image "authorisation" "AUTHORISATION_SERVICE_IMAGE_URI"
fi

if target_matches "subscriptions" && service_changed "apps/backend_api/containers/subscriptions" "apps/backend_api/cmd/services/subscriptions" "apps/backend_api/internal/services/subscriptions" "apps/backend_api/migrations/subscriptions"; then
  build_service "subscriptions" "apps/backend_api/containers/subscriptions/Dockerfile" "SUBSCRIPTION_SERVICE_IMAGE_URI"
else
  emit_existing_service_image "subscriptions" "SUBSCRIPTION_SERVICE_IMAGE_URI"
fi
