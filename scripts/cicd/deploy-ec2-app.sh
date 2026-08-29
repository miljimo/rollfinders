#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-production}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${TERRAFORM_DIR:-${PROJECT_DIR}/infrastructure/terraform}"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ ! -f "${PROJECT_DIR}/image.env" ]]; then
  echo "Missing image.env artifact. Run scripts/cicd/build.sh before EC2 deploy."
  exit 1
fi

# shellcheck disable=SC1091
source "${PROJECT_DIR}/image.env"
if [[ -z "${IMAGE_URI:-}" ]]; then
  echo "image.env is missing IMAGE_URI."
  exit 1
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure >/dev/null
INSTANCE_ID="$(terraform output -raw ec2_app_instance_id)"

if [[ -z "${INSTANCE_ID}" ]]; then
  echo "EC2 app host is not enabled for ${ENVIRONMENT_NAME}."
  exit 1
fi

for _ in $(seq 1 40); do
  status="$(aws ssm describe-instance-information --region "${AWS_REGION}" --filters "Key=InstanceIds,Values=${INSTANCE_ID}" --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)"
  [[ "${status}" == "Online" ]] && break
  sleep 15
done

parameters_file="$(mktemp)"
trap 'rm -f "${parameters_file}"' EXIT
SSM_PREFIX="/rollfinder-${ENVIRONMENT_NAME}/app"
IMAGE_URI_FOR_COMMAND="${IMAGE_URI}" SSM_PREFIX_FOR_COMMAND="${SSM_PREFIX}" python3 -c '
import json
import os
import shlex
import sys

image = shlex.quote(os.environ["IMAGE_URI_FOR_COMMAND"])
command = f"""set -euo pipefail
cd /opt/rollfinder
previous_image=$(docker inspect --format '{{{{.Config.Image}}}}' rollfinder-web-1 2>/dev/null || true)
rollback() {{
  if [ -n "$previous_image" ]; then
    echo "Frontend deployment failed; restoring $previous_image."
    IMAGE_URI="$previous_image" docker compose up -d --no-deps web || true
  fi
}}
trap rollback ERR
aws ecr get-login-password --region {shlex.quote(os.environ.get("AWS_REGION", "eu-west-2"))} | docker login --username AWS --password-stdin {shlex.quote(os.environ["IMAGE_URI_FOR_COMMAND"].split("/")[0])}
aws ssm get-parameters-by-path --region {shlex.quote(os.environ.get("AWS_REGION", "eu-west-2"))} --path {shlex.quote(os.environ["SSM_PREFIX_FOR_COMMAND"])} --with-decryption --recursive --query "Parameters[*].[Name,Value]" --output text | awk -F "\\t" "{{ name=\$1; sub(/^.*\\//, \"\", name); print name \"=\" \$2 }}" >.env.tmp
mv .env.tmp .env
cat >docker-compose.yml <<'COMPOSE'
services:
  web:
    image: ${{IMAGE_URI:?IMAGE_URI is required}}
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: 0.0.0.0
      USER_PUBLIC_BASE_URL: ${{API_PUBLIC_BASE_URL}}
      ACADEMY_PUBLIC_BASE_URL: ${{API_PUBLIC_BASE_URL}}
      NOTIFICATION_SERVICE_BASE_URL: ${{API_PUBLIC_BASE_URL}}
      WALLET_INTERNAL_BASE_URL: ${{API_PUBLIC_BASE_URL}}
      PRICING_INTERNAL_BASE_URL: ${{API_PUBLIC_BASE_URL}}
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 30s
COMPOSE
IMAGE_URI={image} docker compose pull web
IMAGE_URI={image} docker compose run --rm --no-deps web npx prisma migrate deploy
IMAGE_URI={image} docker compose up -d --no-deps web
for attempt in $(seq 1 30); do
  if curl -fsS http://localhost:3000/api/health >/dev/null; then
    trap - ERR
    exit 0
  fi
  sleep 2
done
IMAGE_URI={image} docker compose logs web
false
"""
json.dump({"commands": [command]}, open(sys.argv[1], "w"))
' "${parameters_file}"

command_id="$(aws ssm send-command --region "${AWS_REGION}" --instance-ids "${INSTANCE_ID}" --document-name AWS-RunShellScript --comment "Deploy portal ${IMAGE_URI##*:}" --parameters "file://${parameters_file}" --query 'Command.CommandId' --output text)"
aws ssm wait command-executed --region "${AWS_REGION}" --command-id "${command_id}" --instance-id "${INSTANCE_ID}" || true
status="$(aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${command_id}" --instance-id "${INSTANCE_ID}" --query Status --output text)"

if [[ "${status}" != "Success" ]]; then
  aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${command_id}" --instance-id "${INSTANCE_ID}" --query StandardOutputContent --output text || true
  aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${command_id}" --instance-id "${INSTANCE_ID}" --query StandardErrorContent --output text || true
  echo "Frontend deployment failed with status ${status}."
  exit 1
fi

echo "Frontend ${IMAGE_URI} is healthy on ${ENVIRONMENT_NAME}."
