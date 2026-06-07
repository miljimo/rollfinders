#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"

cd "${PROJECT_DIR}"

load_build_env_var() {
  local env_file="$1"
  local var_name="$2"
  local value

  if ! grep -Eq "^[[:space:]]*(export[[:space:]]+)?${var_name}=" "${env_file}"; then
    return
  fi

  value="$(
    bash -c '
      source "$1" >/dev/null 2>&1
      name="$2"
      printf "%s" "${!name-}"
    ' bash "${env_file}" "${var_name}"
  )"
  export "${var_name}=${value}"
}

for env_file in .env.local .env; do
  if [[ -f "${env_file}" ]]; then
    for build_var in GOOGLE_MAPS_API_KEY NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST; do
      load_build_env_var "${env_file}" "${build_var}"
    done
  fi
done

IMAGE_TAG="${IMAGE_TAG:-${BITBUCKET_COMMIT:-$(git rev-parse --short HEAD)}}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPOSITORY="${ECR_REPOSITORY:-rollfinder/${ENVIRONMENT_NAME}/app}"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build \
  --target runner \
  --build-arg "GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-}" \
  --build-arg "NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY:-}" \
  --build-arg "NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST:-https://eu.i.posthog.com}" \
  -t "${IMAGE_URI}:${IMAGE_TAG}" \
  -t "${IMAGE_URI}:latest" \
  .
docker tag "${IMAGE_URI}:${IMAGE_TAG}" "${IMAGE_URI}:${ENVIRONMENT_NAME}"

container_id="$(docker run -d -p 127.0.0.1::3000 \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=local-docker-validation-secret \
  -e "GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-}" \
  -e "NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY:-}" \
  -e "NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST:-https://eu.i.posthog.com}" \
  "${IMAGE_URI}:${IMAGE_TAG}")"
trap 'docker rm -f "${container_id}" >/dev/null 2>&1 || true' EXIT

host_port="$(docker port "${container_id}" 3000/tcp | sed 's/.*://')"
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${host_port}/api/health" >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    docker logs "${container_id}"
    echo "Docker health validation failed."
    exit 1
  fi
  sleep 2
done

docker push "${IMAGE_URI}:${IMAGE_TAG}"
docker push "${IMAGE_URI}:latest"
docker push "${IMAGE_URI}:${ENVIRONMENT_NAME}"

if [[ -n "${BITBUCKET_TAG:-}" ]]; then
  docker tag "${IMAGE_URI}:${IMAGE_TAG}" "${IMAGE_URI}:${BITBUCKET_TAG}"
  docker push "${IMAGE_URI}:${BITBUCKET_TAG}"
fi

echo "IMAGE_URI=${IMAGE_URI}:${IMAGE_TAG}" > image.env
echo "${IMAGE_URI}:${IMAGE_TAG}"
