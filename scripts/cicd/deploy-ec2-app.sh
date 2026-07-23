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

source "${PROJECT_DIR}/image.env"

required_images=(
  IMAGE_URI
  API_SERVICE_IMAGE_URI
  USER_SERVICE_IMAGE_URI
  AUTHORISATION_SERVICE_IMAGE_URI
  ACADEMY_SERVICE_IMAGE_URI
  ORGANISATION_SERVICE_IMAGE_URI
  COURSE_SERVICE_IMAGE_URI
  BOOKING_SERVICE_IMAGE_URI
  PAYMENT_SERVICE_IMAGE_URI
  SUBSCRIPTION_SERVICE_IMAGE_URI
  NOTIFICATION_SERVICE_IMAGE_URI
  ACCESS_KEY_SERVICE_IMAGE_URI
  WALLET_SERVICE_IMAGE_URI
  TRANSFER_SERVICE_IMAGE_URI
  PRICING_SERVICE_IMAGE_URI
  USAGE_LIMITS_SERVICE_IMAGE_URI
)

for image_var in "${required_images[@]}"; do
  if [[ -z "${!image_var:-}" ]]; then
    echo "image.env is missing ${image_var}."
    exit 1
  fi
done

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
terraform init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure

INSTANCE_ID="$(terraform output -raw ec2_app_instance_id)"
APPLICATION_URL="$(terraform output -raw frontend_url)"

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

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
SSM_PREFIX="/rollfinder-${ENVIRONMENT_NAME}/app"
SUPER_ADMIN_PREFIX="/rollfinder-${ENVIRONMENT_NAME}/super-admin"

read -r -d '' REMOTE_SCRIPT <<REMOTE || true
set -euo pipefail
export AWS_REGION="${AWS_REGION}"
export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID}"
export SSM_PREFIX="${SSM_PREFIX}"
export SUPER_ADMIN_PREFIX="${SUPER_ADMIN_PREFIX}"
export IMAGE_URI="${IMAGE_URI}"
export API_SERVICE_IMAGE_URI="${API_SERVICE_IMAGE_URI}"
export USER_SERVICE_IMAGE_URI="${USER_SERVICE_IMAGE_URI}"
export AUTHORISATION_SERVICE_IMAGE_URI="${AUTHORISATION_SERVICE_IMAGE_URI}"
export ACADEMY_SERVICE_IMAGE_URI="${ACADEMY_SERVICE_IMAGE_URI}"
export ORGANISATION_SERVICE_IMAGE_URI="${ORGANISATION_SERVICE_IMAGE_URI}"
export COURSE_SERVICE_IMAGE_URI="${COURSE_SERVICE_IMAGE_URI}"
export BOOKING_SERVICE_IMAGE_URI="${BOOKING_SERVICE_IMAGE_URI}"
export PAYMENT_SERVICE_IMAGE_URI="${PAYMENT_SERVICE_IMAGE_URI}"
export SUBSCRIPTION_SERVICE_IMAGE_URI="${SUBSCRIPTION_SERVICE_IMAGE_URI}"
export NOTIFICATION_SERVICE_IMAGE_URI="${NOTIFICATION_SERVICE_IMAGE_URI}"
export ACCESS_KEY_SERVICE_IMAGE_URI="${ACCESS_KEY_SERVICE_IMAGE_URI}"
export WALLET_SERVICE_IMAGE_URI="${WALLET_SERVICE_IMAGE_URI}"
export TRANSFER_SERVICE_IMAGE_URI="${TRANSFER_SERVICE_IMAGE_URI}"
export PRICING_SERVICE_IMAGE_URI="${PRICING_SERVICE_IMAGE_URI}"
export USAGE_LIMITS_SERVICE_IMAGE_URI="${USAGE_LIMITS_SERVICE_IMAGE_URI}"
mkdir -p /opt/rollfinder
aws ecr get-login-password --region "\${AWS_REGION}" | docker login --username AWS --password-stdin "\${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com"
{
  aws ssm get-parameters-by-path --region "\${AWS_REGION}" --path "\${SSM_PREFIX}" --with-decryption --recursive --query 'Parameters[*].[Name,Value]' --output text
  aws ssm get-parameters-by-path --region "\${AWS_REGION}" --path "\${SUPER_ADMIN_PREFIX}" --with-decryption --recursive --query 'Parameters[*].[Name,Value]' --output text
} | awk -F '\t' '{ name=\$1; sub(/^.*\\//, "", name); gsub(/'\''/, "'\''\"'\''\"'\''", \$2); print name "='\''" \$2 "'\''" }' >/opt/rollfinder/.env
cat >/opt/rollfinder/docker-compose.yml <<COMPOSE
services:
  web:
    image: \${IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: 0.0.0.0
      API_PUBLIC_BASE_URL: http://api:8080
      NOTIFICATION_SERVICE_BASE_URL: http://notification:8080
      WALLET_INTERNAL_BASE_URL: http://wallet:8080
      PRICING_INTERNAL_BASE_URL: http://pricing:8080
      AUTHORISATION_PUBLIC_BASE_URL: http://authorisation:8080
      ROLLFINDERS_APPLICATION_ID: app_rollfinders
      COURSE_SERVICE_REQUIRED: "false"
    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy
      notification:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 30s

  api:
    image: \${API_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      USER_PUBLIC_BASE_URL: http://users:8080
      AUTHORISATION_PUBLIC_BASE_URL: http://authorisation:8080
      ACADEMY_PUBLIC_BASE_URL: http://academy:8080
      ORGANISATION_PUBLIC_BASE_URL: http://organisation:8080
      COURSE_PUBLIC_BASE_URL: http://courses:8080
      BOOKING_PUBLIC_BASE_URL: http://booking:8080
      PAYMENT_PUBLIC_BASE_URL: http://payments:8080
      SUBSCRIPTION_PUBLIC_BASE_URL: http://subscriptions:8080
      WALLET_PUBLIC_BASE_URL: http://wallet:8080
      TRANSFER_PUBLIC_BASE_URL: http://transfer:8080
      PRICING_PUBLIC_BASE_URL: http://pricing:8080
      USAGE_LIMITS_PUBLIC_BASE_URL: http://usage-limits:8080
      LEGACY_NEXT_PUBLIC_BASE_URL: http://web:3000
      ROLLFINDERS_APPLICATION_ID: app_rollfinders
    depends_on:
      users:
        condition: service_healthy
      authorisation:
        condition: service_healthy
      academy:
        condition: service_healthy
      organisation:
        condition: service_healthy
      courses:
        condition: service_healthy
      booking:
        condition: service_healthy
      payments:
        condition: service_healthy
      subscriptions:
        condition: service_healthy
      wallet:
        condition: service_healthy
      transfer:
        condition: service_healthy
      pricing:
        condition: service_healthy
      usage-limits:
        condition: service_healthy
    healthcheck: &service_health
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/healthz || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s

  users:
    image: \${USER_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      DEFAULT_USER_ROLE: STANDARD_USER
      AUTHORISATION_CUTOVER: "true"
    healthcheck: *service_health

  authorisation:
    image: \${AUTHORISATION_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health

  academy:
    image: \${ACADEMY_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health

  organisation:
    image: \${ORGANISATION_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health

  courses:
    image: \${COURSE_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health

  booking:
    image: \${BOOKING_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health

  payments:
    image: \${PAYMENT_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      PAYMENT_PUBLIC_BASE_URL: http://api:8080
      PAYMENT_DEFAULT_CLIENT_ID: rollfinders
      PAYMENT_DEFAULT_CLIENT_NAME: Rollfinders
      PAYMENT_DEFAULT_CLIENT_CALLBACK_URL: ${APPLICATION_URL}/payments/status
    healthcheck: *service_health

  subscriptions:
    image: \${SUBSCRIPTION_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}
      PAYMENT_PUBLIC_BASE_URL: http://payments:8080
      ORGANISATION_PUBLIC_BASE_URL: http://organisation:8080
    healthcheck: *service_health

  notification:
    image: \${NOTIFICATION_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      SMTP_DEFAULT_FROM_EMAIL: support@rollfinders.com
      SMTP_DEFAULT_FROM_NAME: RollFinders
    healthcheck: *service_health

  wallet:
    image: \${WALLET_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}
    healthcheck: *service_health

  transfer:
    image: \${TRANSFER_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}
    healthcheck: *service_health

  pricing:
    image: \${PRICING_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}
    healthcheck: *service_health

  access-keys:
    image: \${ACCESS_KEY_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
      SERVICE_API_KEY: \\\${USER_SERVICE_API_KEY}
    healthcheck: *service_health

  usage-limits:
    image: \${USAGE_LIMITS_SERVICE_IMAGE_URI}
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: "8080"
    healthcheck: *service_health
COMPOSE
cd /opt/rollfinder
docker compose pull
docker compose up -d --remove-orphans
docker image prune -af --filter "until=168h"
REMOTE

PARAMETERS_FILE="$(mktemp)"
trap 'rm -f "${PARAMETERS_FILE}"' EXIT
python3 -c 'import json,sys; json.dump({"commands":[sys.stdin.read()]}, open(sys.argv[1], "w"))' "${PARAMETERS_FILE}" <<<"${REMOTE_SCRIPT}"

COMMAND_ID="$(
  aws ssm send-command \
    --region "${AWS_REGION}" \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --comment "Deploy RollFinders EC2 app stack" \
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
  echo "EC2 deployment failed with status ${STATUS}."
  exit 1
fi

echo "EC2 deployment completed for ${INSTANCE_ID}."
