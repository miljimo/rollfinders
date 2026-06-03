#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-${BITBUCKET_COMMIT:-$(git rev-parse --short HEAD)}}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REPOSITORY="${ECR_REPOSITORY:-rollfinder/${ENVIRONMENT_NAME}/app}"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build --target runner -t "${IMAGE_URI}:${IMAGE_TAG}" -t "${IMAGE_URI}:latest" .
docker push "${IMAGE_URI}:${IMAGE_TAG}"
docker push "${IMAGE_URI}:latest"

if [[ -n "${BITBUCKET_TAG:-}" ]]; then
  docker tag "${IMAGE_URI}:${IMAGE_TAG}" "${IMAGE_URI}:${BITBUCKET_TAG}"
  docker push "${IMAGE_URI}:${BITBUCKET_TAG}"
fi

echo "IMAGE_URI=${IMAGE_URI}:${IMAGE_TAG}" > image.env
echo "${IMAGE_URI}:${IMAGE_TAG}"
