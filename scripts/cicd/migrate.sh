#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${TERRAFORM_DIR:-${PROJECT_DIR}/infrastructure/terraform}"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ "${ENVIRONMENT_NAME}" == "production" && "${PRODUCTION_MIGRATION_APPROVED:-}" != "true" ]]; then
  echo "Production migrations require PRODUCTION_MIGRATION_APPROVED=true."
  exit 1
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure

EC2_APP_INSTANCE_ID="$(terraform output -raw ec2_app_instance_id 2>/dev/null || true)"
if [[ -n "${EC2_APP_INSTANCE_ID}" ]]; then
  "${SCRIPT_DIR}/run-ec2-web-command.sh" "sh scripts/cicd/run-service-sql-migrations.sh && npx prisma migrate deploy && sh scripts/cicd/run-service-sql-migrations.sh"
  echo "EC2 migration command completed successfully."
  exit 0
fi

CLUSTER="$(terraform output -raw ecs_cluster_name)"
SERVICE="$(terraform output -raw ecs_service_name)"
TASK_DEFINITION="$(aws ecs describe-services --region "${AWS_REGION}" --cluster "${CLUSTER}" --services "${SERVICE}" --query 'services[0].taskDefinition' --output text)"
SUBNETS="$(aws ecs describe-services --region "${AWS_REGION}" --cluster "${CLUSTER}" --services "${SERVICE}" --query 'join(`,`, services[0].networkConfiguration.awsvpcConfiguration.subnets)' --output text)"
SECURITY_GROUPS="$(aws ecs describe-services --region "${AWS_REGION}" --cluster "${CLUSTER}" --services "${SERVICE}" --query 'join(`,`, services[0].networkConfiguration.awsvpcConfiguration.securityGroups)' --output text)"
ASSIGN_PUBLIC_IP="$(aws ecs describe-services --region "${AWS_REGION}" --cluster "${CLUSTER}" --services "${SERVICE}" --query 'services[0].networkConfiguration.awsvpcConfiguration.assignPublicIp' --output text)"

TASK_ARN="$(aws ecs run-task \
  --region "${AWS_REGION}" \
  --cluster "${CLUSTER}" \
  --launch-type FARGATE \
  --task-definition "${TASK_DEFINITION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=${ASSIGN_PUBLIC_IP}}" \
  --overrides '{"containerOverrides":[{"name":"web","command":["sh","-lc","sh scripts/cicd/run-service-sql-migrations.sh && npx prisma migrate deploy && sh scripts/cicd/run-service-sql-migrations.sh"]}]}' \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "${TASK_ARN}" || "${TASK_ARN}" == "None" ]]; then
  echo "Failed to start migration task."
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
  echo "Migration task failed with exit code ${EXIT_CODE}. See CloudWatch logs for /ecs/${ENVIRONMENT_NAME:-dev}."
  exit 1
fi

echo "Migration task completed successfully."
