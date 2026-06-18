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

service_changed() {
  local path="$1"

  if [[ "${FORCE_SERVICE_REDEPLOY}" == "true" ]]; then
    return 0
  fi

  if [[ -n "${BITBUCKET_COMMIT:-}" ]]; then
    if git rev-parse "${BITBUCKET_COMMIT}^" >/dev/null 2>&1; then
      git diff --quiet "${BITBUCKET_COMMIT}^" "${BITBUCKET_COMMIT}" -- "${path}" && return 1 || return 0
    fi
  fi

  if git rev-parse HEAD^ >/dev/null 2>&1; then
    git diff --quiet HEAD^ HEAD -- "${path}" && return 1 || return 0
  fi

  echo "Unable to determine changed paths; treating ${path} as changed."
  return 0
}

target_matches() {
  local service="$1"
  [[ "${SERVICE_REDEPLOY_TARGET}" == "all" || -z "${SERVICE_REDEPLOY_TARGET}" || "${SERVICE_REDEPLOY_TARGET}" == "${service}" ]]
}

build_service() {
  local service="$1"
  local context="$2"
  local env_var="$3"
  local repository="rollfinder/${ENVIRONMENT_NAME}/${service}"
  local registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  local image_uri="${registry}/${repository}"

  if [[ ! -d "${context}" ]]; then
    echo "Skipping ${service} image build; ${context} does not exist in this checkout."
    return 0
  fi

  aws ecr describe-repositories --region "${AWS_REGION}" --repository-names "${repository}" >/dev/null 2>&1 \
    || aws ecr create-repository --region "${AWS_REGION}" --repository-name "${repository}" >/dev/null

  docker build \
    -t "${image_uri}:${IMAGE_TAG}" \
    -t "${image_uri}:latest" \
    -t "${image_uri}:${ENVIRONMENT_NAME}" \
    "${context}"

  docker push "${image_uri}:${IMAGE_TAG}"
  docker push "${image_uri}:latest"
  docker push "${image_uri}:${ENVIRONMENT_NAME}"

  printf '%s=%s\n' "${env_var}" "${image_uri}:${IMAGE_TAG}" >> "${IMAGE_ENV_FILE}"
  echo "Built ${service}: ${image_uri}:${IMAGE_TAG}"
}

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

if target_matches "users" && service_changed "services/users"; then
  build_service "users" "services/users" "USER_SERVICE_IMAGE_URI"
else
  echo "Skipping users image build; no service changes detected."
fi

if target_matches "payments" && service_changed "services/payments"; then
  build_service "payments" "services/payments" "PAYMENT_SERVICE_IMAGE_URI"
else
  echo "Skipping payments image build; no service changes detected."
fi
