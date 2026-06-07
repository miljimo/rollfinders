#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${1:-}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${ROOT_DIR}/terraform"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"
source "${ROOT_DIR}/scripts/cicd/terraform-backend.sh"

case "${ENVIRONMENT_NAME}" in
  dev|production) ;;
  *)
    echo "Usage: ./scripts/inventory.sh dev|production"
    exit 1
    ;;
esac

if ! command -v terraform >/dev/null 2>&1; then
  "${ROOT_DIR}/scripts/terraform-validate.sh" >/dev/null
  TERRAFORM_BIN="${ROOT_DIR}/.bin/terraform"
else
  TERRAFORM_BIN="terraform"
fi

cd "${TERRAFORM_DIR}"
terraform_backend_args "${ENVIRONMENT_NAME}" "${BACKEND_CONFIG}"
"${TERRAFORM_BIN}" init "${BACKEND_CONFIG_ARGS[@]}" -reconfigure >/dev/null

cluster="$("${TERRAFORM_BIN}" output -raw ecs_cluster_name 2>/dev/null || true)"
service="$("${TERRAFORM_BIN}" output -raw ecs_service_name 2>/dev/null || true)"
ecr="$("${TERRAFORM_BIN}" output -raw ecr_repository_url 2>/dev/null || true)"
rds="$("${TERRAFORM_BIN}" output -raw rds_instance_identifier 2>/dev/null || true)"
alb="$("${TERRAFORM_BIN}" output -raw alb_dns_name 2>/dev/null || true)"
zone="$("${TERRAFORM_BIN}" output -raw hosted_zone_id 2>/dev/null || true)"
cloudfront="$("${TERRAFORM_BIN}" output -raw cloudfront_distribution_id 2>/dev/null || true)"
secret="$("${TERRAFORM_BIN}" output -raw secrets_manager_secret_arn 2>/dev/null || true)"

cat <<EOF
ECS Cluster
${cluster}

ECS Services
${service}

ECR Repositories
${ecr}

RDS Instances
${rds}

ALBs
${alb}

Route53 Records
Hosted Zone: ${zone}
Frontend: $("${TERRAFORM_BIN}" output -raw frontend_domain 2>/dev/null || true)
API: $("${TERRAFORM_BIN}" output -raw api_url 2>/dev/null || true)

CloudFront Distributions
${cloudfront}

S3 Buckets
${BACKEND_BUCKET}

Secrets
${secret}
EOF
