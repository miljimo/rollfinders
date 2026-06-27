#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

for env_file in .env.local .env; do
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
done

IMAGE_NAME="${IMAGE_NAME:-rollfinder}"
IMAGE_TAG="${IMAGE_TAG:-local}"

echo "==> Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}"
docker build \
  --target runner \
  --build-arg "NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY:-}" \
  --build-arg "NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST:-https://eu.i.posthog.com}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  .

echo "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
