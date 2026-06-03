#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ "${ENVIRONMENT_NAME}" != "dev" && "${ALLOW_NON_DEV_SEED:-}" != "true" ]]; then
  echo "Automatic seed execution is only allowed for dev."
  exit 1
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure

CLUSTER="$(terraform output -raw ecs_cluster_name)"
TASK_DEFINITION="$(terraform output -raw ecs_task_definition_arn)"
SUBNETS="$(terraform output -json private_subnet_ids | python3 -c 'import json,sys; print(",".join(json.load(sys.stdin)))')"
SECURITY_GROUP="$(terraform output -raw ecs_security_group_id)"

TASK_ARN="$(aws ecs run-task \
  --region "${AWS_REGION}" \
  --cluster "${CLUSTER}" \
  --launch-type FARGATE \
  --task-definition "${TASK_DEFINITION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"web","command":["npm","run","seed"]}]}' \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "${TASK_ARN}" || "${TASK_ARN}" == "None" ]]; then
  echo "Failed to start seed task."
  exit 1
fi

aws ecs wait tasks-stopped \
  --region "${AWS_REGION}" \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}"

EXIT_CODE="$(aws ecs describe-tasks \
  --region "${AWS_REGION}" \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}" \
  --query 'tasks[0].containers[?name==`web`].exitCode | [0]' \
  --output text)"

if [[ "${EXIT_CODE}" != "0" ]]; then
  echo "Seed task failed with exit code ${EXIT_CODE}. See CloudWatch logs for /ecs/${ENVIRONMENT_NAME}."
  exit 1
fi

echo "Seed task completed successfully."
