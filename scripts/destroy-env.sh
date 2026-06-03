#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME="${1:-}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${ROOT_DIR}/terraform"
TFVARS="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/common.tfvars"
BACKEND_CONFIG="${TERRAFORM_DIR}/environments/${ENVIRONMENT_NAME}/backend.tfvars"

case "${ENVIRONMENT_NAME}" in
  dev|staging|production) ;;
  *)
    echo "Usage: ./scripts/destroy-env.sh dev|staging|production"
    exit 1
    ;;
esac

if [[ ! -f "${TFVARS}" || ! -f "${BACKEND_CONFIG}" ]]; then
  echo "Missing Terraform environment files for ${ENVIRONMENT_NAME}."
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  "${ROOT_DIR}/scripts/terraform-validate.sh" >/dev/null
  export TERRAFORM_BIN="${ROOT_DIR}/.bin/terraform"
else
  export TERRAFORM_BIN="terraform"
fi

"${ROOT_DIR}/scripts/cicd/bootstrap-state.sh"

cd "${TERRAFORM_DIR}"
"${TERRAFORM_BIN}" init -backend-config="${BACKEND_CONFIG}" -reconfigure

if [[ "${ENVIRONMENT_NAME}" == "staging" ]]; then
  confirmation="${CONFIRM_DESTROY:-}"
  if [[ -z "${confirmation}" ]]; then
    read -r -p "Type destroy staging to continue: " confirmation
  fi
  if [[ "${confirmation}" != "destroy staging" ]]; then
    echo "Staging destroy cancelled."
    exit 1
  fi
fi

if [[ "${ENVIRONMENT_NAME}" == "production" ]]; then
  if [[ "${ALLOW_PRODUCTION_DESTROY:-}" != "true" ]]; then
    echo "Production destroy blocked. Set ALLOW_PRODUCTION_DESTROY=true."
    exit 1
  fi

  confirmation="${PRODUCTION_DESTROY_CONFIRMATION:-}"
  if [[ -z "${confirmation}" ]]; then
    read -r -p "Type I_UNDERSTAND_THIS_WILL_DESTROY_PRODUCTION to continue: " confirmation
  fi
  if [[ "${confirmation}" != "I_UNDERSTAND_THIS_WILL_DESTROY_PRODUCTION" ]]; then
    echo "Production destroy cancelled."
    exit 1
  fi

  db_identifier="$("${TERRAFORM_BIN}" output -raw rds_instance_identifier)"
  snapshot_identifier="${db_identifier}-pre-destroy-$(date -u +%Y%m%d%H%M%S)"

  aws rds create-db-snapshot \
    --region "${AWS_REGION}" \
    --db-instance-identifier "${db_identifier}" \
    --db-snapshot-identifier "${snapshot_identifier}"

  aws rds wait db-snapshot-completed \
    --region "${AWS_REGION}" \
    --db-snapshot-identifier "${snapshot_identifier}"

  aws rds modify-db-instance \
    --region "${AWS_REGION}" \
    --db-instance-identifier "${db_identifier}" \
    --no-deletion-protection \
    --apply-immediately

  aws rds wait db-instance-available \
    --region "${AWS_REGION}" \
    --db-instance-identifier "${db_identifier}"
fi

"${TERRAFORM_BIN}" plan -destroy \
  -var-file="${TFVARS}" \
  -var="image_uri=destroy-placeholder" \
  -out="destroy-${ENVIRONMENT_NAME}.tfplan"

"${TERRAFORM_BIN}" apply -auto-approve "destroy-${ENVIRONMENT_NAME}.tfplan"
