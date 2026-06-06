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

if [[ "${ENVIRONMENT_NAME}" == "production" && "${PRODUCTION_APPROVED:-}" != "true" ]]; then
  echo "Production deploy requires PRODUCTION_APPROVED=true."
  exit 1
fi

if [[ "${DEPLOYMENT_LOCK_HELD:-}" != "true" && "${ALLOW_UNLOCKED_DEPLOY:-}" != "true" ]]; then
  echo "Deployments must run through scripts/cicd/deploy-environment.sh so the global deployment lock is held."
  exit 1
fi

if [[ "${ENVIRONMENT_NAME}" != "dev" && "${PROMOTION_DEPLOYMENT:-}" != "true" && "${ALLOW_DIRECT_ENV_DEPLOY:-}" != "true" ]]; then
  echo "${ENVIRONMENT_NAME} deployments must be promoted from the previous environment."
  exit 1
fi

if [[ ! -f "${PROJECT_DIR}/image.env" ]]; then
  echo "Missing image.env artifact. Run scripts/cicd/build.sh before deploy."
  exit 1
fi

source "${PROJECT_DIR}/image.env"

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  "${SCRIPT_DIR}/deploy-academy-claim-invitation-template.sh" --validate-only
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure

ECS_CLUSTER="$(terraform output -raw ecs_cluster_name)"
ECS_SERVICE="$(terraform output -raw ecs_service_name)"
FRONTEND_URL="$(terraform output -raw frontend_url)"
WWW_URL="$(terraform output -raw www_url)"
API_URL="$(terraform output -raw api_url)"
CERTIFICATE_ARN="$(terraform output -raw certificate_arn)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for application-only ECS deployments."
  exit 1
fi

TASK_DEFINITION_FILE="$(mktemp)"
trap 'rm -f "${TASK_DEFINITION_FILE}"' EXIT

CURRENT_TASK_DEFINITION_ARN="$(
  aws ecs describe-services \
    --region "${AWS_REGION}" \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --query 'services[0].taskDefinition' \
    --output text
)"

TASK_DEFINITION_PAYLOAD="$(
  aws ecs describe-task-definition \
    --region "${AWS_REGION}" \
    --task-definition "${CURRENT_TASK_DEFINITION_ARN}" \
    --query 'taskDefinition'
)"

TASK_DEFINITION_PAYLOAD="${TASK_DEFINITION_PAYLOAD}" IMAGE_URI="${IMAGE_URI}" TASK_DEFINITION_FILE="${TASK_DEFINITION_FILE}" python3 - <<'PY'
import json
import os

task_definition = json.loads(os.environ["TASK_DEFINITION_PAYLOAD"])
image_uri = os.environ["IMAGE_URI"]
task_definition_file = os.environ["TASK_DEFINITION_FILE"]

for container in task_definition["containerDefinitions"]:
    if container["name"] == "web":
        container["image"] = image_uri

payload = {
    key: task_definition[key]
    for key in (
        "family",
        "taskRoleArn",
        "executionRoleArn",
        "networkMode",
        "containerDefinitions",
        "volumes",
        "placementConstraints",
        "requiresCompatibilities",
        "cpu",
        "memory",
        "runtimePlatform",
    )
    if task_definition.get(key) is not None
}

with open(task_definition_file, "w", encoding="utf-8") as file:
    json.dump(payload, file)
PY

NEW_TASK_DEFINITION_ARN="$(
  aws ecs register-task-definition \
    --region "${AWS_REGION}" \
    --cli-input-json "file://${TASK_DEFINITION_FILE}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text
)"

aws ecs update-service \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${NEW_TASK_DEFINITION_ARN}" \
  --force-new-deployment >/dev/null

aws ecs wait services-stable \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}"

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  "${SCRIPT_DIR}/deploy-academy-claim-invitation-template.sh"
fi

cat <<EOF
================================================

Deployment Successful

Environment:
${ENVIRONMENT_NAME}

Frontend URL:
${FRONTEND_URL}

WWW URL:
${WWW_URL}

API URL:
${API_URL}

ECS Cluster:
${ECS_CLUSTER}

Service:
${ECS_SERVICE}

Docker Image:
${IMAGE_URI}

Certificate ARN:
${CERTIFICATE_ARN}

================================================
EOF
