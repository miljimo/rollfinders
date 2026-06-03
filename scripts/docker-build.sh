#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

IMAGE_NAME="${IMAGE_NAME:-rollfinder}"
IMAGE_TAG="${IMAGE_TAG:-local}"

echo "==> Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}"
docker build --target runner -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
