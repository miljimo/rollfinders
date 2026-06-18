#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"
AWS_REGION="${AWS_REGION:-eu-west-2}"

if [[ -f "${PROJECT_DIR}/image.env" ]]; then
  source "${PROJECT_DIR}/image.env"
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure
APPLICATION_URL="$(terraform output -raw frontend_url)"

curl -fsS "${APPLICATION_URL}/api/health"
curl -fsS "${APPLICATION_URL}/api/health?deep=1"

CLUSTER="$(terraform output -raw ecs_cluster_name)"
TASK_DEFINITION="$(terraform output -raw ecs_task_definition_arn)"
SUBNETS="$(terraform output -json private_subnet_ids | python3 -c 'import json,sys; print(",".join(json.load(sys.stdin)))')"
SECURITY_GROUP="$(terraform output -raw ecs_security_group_id)"

if [[ -n "${USER_SERVICE_IMAGE_URI:-}" && -n "${PAYMENT_SERVICE_IMAGE_URI:-}" ]]; then
  PRIVATE_SMOKE_TASK_ARN="$(aws ecs run-task \
    --region "${AWS_REGION}" \
    --cluster "${CLUSTER}" \
    --launch-type FARGATE \
    --task-definition "${TASK_DEFINITION}" \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"web","command":["sh","-lc","sleep 10; curl -fsS http://127.0.0.1:8081/healthz; curl -fsS http://127.0.0.1:8081/readyz; curl -fsS http://127.0.0.1:8082/healthz; curl -fsS http://127.0.0.1:8082/readyz"]}]}' \
    --query 'tasks[0].taskArn' \
    --output text)"

  if [[ -z "${PRIVATE_SMOKE_TASK_ARN}" || "${PRIVATE_SMOKE_TASK_ARN}" == "None" ]]; then
    echo "Failed to start private service smoke task."
    exit 1
  fi

  aws ecs wait tasks-stopped \
    --region "${AWS_REGION}" \
    --cluster "${CLUSTER}" \
    --tasks "${PRIVATE_SMOKE_TASK_ARN}"

  PRIVATE_SMOKE_EXIT_CODE="$(aws ecs describe-tasks \
    --region "${AWS_REGION}" \
    --cluster "${CLUSTER}" \
    --tasks "${PRIVATE_SMOKE_TASK_ARN}" \
    --query 'tasks[0].containers[?name==`web`].exitCode | [0]' \
    --output text)"

  if [[ "${PRIVATE_SMOKE_EXIT_CODE}" != "0" ]]; then
    echo "Private service smoke task failed with exit code ${PRIVATE_SMOKE_EXIT_CODE}."
    exit 1
  fi
else
  echo "Skipping private service smoke checks because service image metadata is not present."
fi

echo "Application URL: ${APPLICATION_URL}"
