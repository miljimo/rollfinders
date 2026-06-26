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

if [[ "${ENVIRONMENT_NAME}" == "production" && "${PRODUCTION_APPROVED:-}" != "true" ]]; then
  echo "Production deploy requires PRODUCTION_APPROVED=true."
  exit 1
fi

if [[ "${DEPLOYMENT_LOCK_HELD:-}" != "true" && "${ALLOW_UNLOCKED_DEPLOY:-}" != "true" ]]; then
  echo "Deployments must run through scripts/cicd/deploy-environment.sh so the global deployment lock is held."
  exit 1
fi

if [[ "${ENVIRONMENT_NAME}" != "dev" && "${ENVIRONMENT_NAME}" != "production" && "${PROMOTION_DEPLOYMENT:-}" != "true" && "${ALLOW_DIRECT_ENV_DEPLOY:-}" != "true" ]]; then
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
CERTIFICATE_ARN="$(terraform output -raw certificate_arn 2>/dev/null || true)"

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
TERRAFORM_TASK_DEFINITION_ARN="$(terraform output -raw ecs_task_definition_arn 2>/dev/null || true)"
BASE_TASK_DEFINITION_ARN="${TERRAFORM_TASK_DEFINITION_ARN:-${CURRENT_TASK_DEFINITION_ARN}}"

TASK_DEFINITION_PAYLOAD="$(
  aws ecs describe-task-definition \
    --region "${AWS_REGION}" \
    --task-definition "${BASE_TASK_DEFINITION_ARN}" \
    --query 'taskDefinition'
)"

IMAGES_ALREADY_MATCH="$(
  TASK_DEFINITION_PAYLOAD="${TASK_DEFINITION_PAYLOAD}" IMAGE_URI="${IMAGE_URI}" API_SERVICE_IMAGE_URI="${API_SERVICE_IMAGE_URI:-}" USER_SERVICE_IMAGE_URI="${USER_SERVICE_IMAGE_URI:-}" AUTHORISATION_SERVICE_IMAGE_URI="${AUTHORISATION_SERVICE_IMAGE_URI:-}" ACADEMY_SERVICE_IMAGE_URI="${ACADEMY_SERVICE_IMAGE_URI:-}" ORGANISATION_SERVICE_IMAGE_URI="${ORGANISATION_SERVICE_IMAGE_URI:-}" COURSE_SERVICE_IMAGE_URI="${COURSE_SERVICE_IMAGE_URI:-}" BOOKING_SERVICE_IMAGE_URI="${BOOKING_SERVICE_IMAGE_URI:-}" PAYMENT_SERVICE_IMAGE_URI="${PAYMENT_SERVICE_IMAGE_URI:-}" SUBSCRIPTION_SERVICE_IMAGE_URI="${SUBSCRIPTION_SERVICE_IMAGE_URI:-}" NOTIFICATION_SERVICE_IMAGE_URI="${NOTIFICATION_SERVICE_IMAGE_URI:-}" ANALYTICS_SERVICE_IMAGE_URI="${ANALYTICS_SERVICE_IMAGE_URI:-}" python3 - <<'PY'
import json
import os

task_definition = json.loads(os.environ["TASK_DEFINITION_PAYLOAD"])
desired = {
    "web": os.environ["IMAGE_URI"],
}
if os.environ.get("USER_SERVICE_IMAGE_URI"):
    desired["users"] = os.environ["USER_SERVICE_IMAGE_URI"]
if os.environ.get("PAYMENT_SERVICE_IMAGE_URI"):
    desired["payments"] = os.environ["PAYMENT_SERVICE_IMAGE_URI"]
if os.environ.get("API_SERVICE_IMAGE_URI"):
    desired["api"] = os.environ["API_SERVICE_IMAGE_URI"]
if os.environ.get("AUTHORISATION_SERVICE_IMAGE_URI"):
    desired["authorisation"] = os.environ["AUTHORISATION_SERVICE_IMAGE_URI"]
if os.environ.get("ACADEMY_SERVICE_IMAGE_URI"):
    desired["academy"] = os.environ["ACADEMY_SERVICE_IMAGE_URI"]
if os.environ.get("ORGANISATION_SERVICE_IMAGE_URI"):
    desired["organisation"] = os.environ["ORGANISATION_SERVICE_IMAGE_URI"]
if os.environ.get("COURSE_SERVICE_IMAGE_URI"):
    desired["courses"] = os.environ["COURSE_SERVICE_IMAGE_URI"]
if os.environ.get("BOOKING_SERVICE_IMAGE_URI"):
    desired["booking"] = os.environ["BOOKING_SERVICE_IMAGE_URI"]
if os.environ.get("SUBSCRIPTION_SERVICE_IMAGE_URI"):
    desired["subscriptions"] = os.environ["SUBSCRIPTION_SERVICE_IMAGE_URI"]
if os.environ.get("NOTIFICATION_SERVICE_IMAGE_URI"):
    desired["notification"] = os.environ["NOTIFICATION_SERVICE_IMAGE_URI"]
if os.environ.get("ANALYTICS_SERVICE_IMAGE_URI"):
    desired["analytics"] = os.environ["ANALYTICS_SERVICE_IMAGE_URI"]

current = {container["name"]: container["image"] for container in task_definition["containerDefinitions"]}
print("true" if all(current.get(name) == image for name, image in desired.items()) else "false")
PY
)"

if [[ "${IMAGES_ALREADY_MATCH}" == "true" && "${CURRENT_TASK_DEFINITION_ARN}" == "${BASE_TASK_DEFINITION_ARN}" ]]; then
  aws ecs wait services-stable \
    --region "${AWS_REGION}" \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}"

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
  exit 0
fi

TASK_DEFINITION_PAYLOAD="${TASK_DEFINITION_PAYLOAD}" IMAGE_URI="${IMAGE_URI}" API_SERVICE_IMAGE_URI="${API_SERVICE_IMAGE_URI:-}" USER_SERVICE_IMAGE_URI="${USER_SERVICE_IMAGE_URI:-}" AUTHORISATION_SERVICE_IMAGE_URI="${AUTHORISATION_SERVICE_IMAGE_URI:-}" ACADEMY_SERVICE_IMAGE_URI="${ACADEMY_SERVICE_IMAGE_URI:-}" ORGANISATION_SERVICE_IMAGE_URI="${ORGANISATION_SERVICE_IMAGE_URI:-}" COURSE_SERVICE_IMAGE_URI="${COURSE_SERVICE_IMAGE_URI:-}" BOOKING_SERVICE_IMAGE_URI="${BOOKING_SERVICE_IMAGE_URI:-}" PAYMENT_SERVICE_IMAGE_URI="${PAYMENT_SERVICE_IMAGE_URI:-}" SUBSCRIPTION_SERVICE_IMAGE_URI="${SUBSCRIPTION_SERVICE_IMAGE_URI:-}" NOTIFICATION_SERVICE_IMAGE_URI="${NOTIFICATION_SERVICE_IMAGE_URI:-}" ANALYTICS_SERVICE_IMAGE_URI="${ANALYTICS_SERVICE_IMAGE_URI:-}" TASK_DEFINITION_FILE="${TASK_DEFINITION_FILE}" python3 - <<'PY'
import json
import os

task_definition = json.loads(os.environ["TASK_DEFINITION_PAYLOAD"])
task_definition_file = os.environ["TASK_DEFINITION_FILE"]
image_by_container = {
    "web": os.environ["IMAGE_URI"],
}
if os.environ.get("USER_SERVICE_IMAGE_URI"):
    image_by_container["users"] = os.environ["USER_SERVICE_IMAGE_URI"]
if os.environ.get("PAYMENT_SERVICE_IMAGE_URI"):
    image_by_container["payments"] = os.environ["PAYMENT_SERVICE_IMAGE_URI"]
if os.environ.get("API_SERVICE_IMAGE_URI"):
    image_by_container["api"] = os.environ["API_SERVICE_IMAGE_URI"]
if os.environ.get("AUTHORISATION_SERVICE_IMAGE_URI"):
    image_by_container["authorisation"] = os.environ["AUTHORISATION_SERVICE_IMAGE_URI"]
if os.environ.get("ACADEMY_SERVICE_IMAGE_URI"):
    image_by_container["academy"] = os.environ["ACADEMY_SERVICE_IMAGE_URI"]
if os.environ.get("ORGANISATION_SERVICE_IMAGE_URI"):
    image_by_container["organisation"] = os.environ["ORGANISATION_SERVICE_IMAGE_URI"]
if os.environ.get("COURSE_SERVICE_IMAGE_URI"):
    image_by_container["courses"] = os.environ["COURSE_SERVICE_IMAGE_URI"]
if os.environ.get("BOOKING_SERVICE_IMAGE_URI"):
    image_by_container["booking"] = os.environ["BOOKING_SERVICE_IMAGE_URI"]
if os.environ.get("SUBSCRIPTION_SERVICE_IMAGE_URI"):
    image_by_container["subscriptions"] = os.environ["SUBSCRIPTION_SERVICE_IMAGE_URI"]
if os.environ.get("NOTIFICATION_SERVICE_IMAGE_URI"):
    image_by_container["notification"] = os.environ["NOTIFICATION_SERVICE_IMAGE_URI"]
if os.environ.get("ANALYTICS_SERVICE_IMAGE_URI"):
    image_by_container["analytics"] = os.environ["ANALYTICS_SERVICE_IMAGE_URI"]

for container in task_definition["containerDefinitions"]:
    if container["name"] in image_by_container:
        container["image"] = image_by_container[container["name"]]

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
