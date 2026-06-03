#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ "${ENVIRONMENT_NAME}" == "production" && "${PRODUCTION_MIGRATION_APPROVED:-}" != "true" ]]; then
  echo "Production migrations require PRODUCTION_MIGRATION_APPROVED=true."
  exit 1
fi

cd "${TERRAFORM_DIR}"
terraform init -backend-config="${BACKEND_CONFIG}" -reconfigure

CLUSTER="$(terraform output -raw ecs_cluster_name)"
TASK_DEFINITION="$(terraform output -raw ecs_task_definition_arn)"
SUBNETS="$(terraform output -json private_subnet_ids | jq -r 'join(",")')"
SECURITY_GROUP="$(terraform output -raw ecs_security_group_id)"

aws ecs run-task \
  --region "${AWS_REGION}" \
  --cluster "${CLUSTER}" \
  --launch-type FARGATE \
  --task-definition "${TASK_DEFINITION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"web","command":["npx","prisma","migrate","deploy"]}]}'
