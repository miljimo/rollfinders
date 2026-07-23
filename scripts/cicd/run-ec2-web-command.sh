#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-dev}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${TERRAFORM_DIR:-${PROJECT_DIR}/infrastructure/terraform}"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

if [[ "$#" -lt 1 ]]; then
  echo "Usage: $0 <command>"
  exit 1
fi

REMOTE_COMMAND="$1"

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure >/dev/null

INSTANCE_ID="$(terraform output -raw ec2_app_instance_id)"
if [[ -z "${INSTANCE_ID}" ]]; then
  echo "EC2 app host is not enabled for ${ENVIRONMENT_NAME}."
  exit 1
fi

for _ in $(seq 1 40); do
  STATUS="$(
    aws ssm describe-instance-information \
      --region "${AWS_REGION}" \
      --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
      --query 'InstanceInformationList[0].PingStatus' \
      --output text 2>/dev/null || true
  )"
  if [[ "${STATUS}" == "Online" ]]; then
    break
  fi
  sleep 15
done

PARAMETERS_FILE="$(mktemp)"
trap 'rm -f "${PARAMETERS_FILE}"' EXIT
python3 -c 'import json,sys; json.dump({"commands":[sys.stdin.read()]}, open(sys.argv[1], "w"))' "${PARAMETERS_FILE}" <<REMOTE
set -euo pipefail
cd /opt/rollfinder
docker compose exec -T web sh -lc $(printf '%q' "${REMOTE_COMMAND}")
REMOTE

COMMAND_ID="$(
  aws ssm send-command \
    --region "${AWS_REGION}" \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --comment "Run RollFinders web command" \
    --parameters "file://${PARAMETERS_FILE}" \
    --query 'Command.CommandId' \
    --output text
)"

aws ssm wait command-executed \
  --region "${AWS_REGION}" \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" || true

STATUS="$(aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${COMMAND_ID}" --instance-id "${INSTANCE_ID}" --query 'Status' --output text)"
if [[ "${STATUS}" != "Success" ]]; then
  aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${COMMAND_ID}" --instance-id "${INSTANCE_ID}" --query 'StandardOutputContent' --output text || true
  aws ssm get-command-invocation --region "${AWS_REGION}" --command-id "${COMMAND_ID}" --instance-id "${INSTANCE_ID}" --query 'StandardErrorContent' --output text || true
  echo "EC2 web command failed with status ${STATUS}."
  exit 1
fi

aws ssm get-command-invocation \
  --region "${AWS_REGION}" \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text
