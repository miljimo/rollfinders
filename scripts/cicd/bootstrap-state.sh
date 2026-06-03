#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/aws-oidc.sh"
source "${SCRIPT_DIR}/terraform-backend.sh"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BOOTSTRAP_DIR="${PROJECT_DIR}/terraform/bootstrap"
ENVIRONMENTS=("dev" "staging" "production")
TERRAFORM_BIN="${TERRAFORM_BIN:-terraform}"
bucket="$(terraform_backend_bucket)"

cd "${BOOTSTRAP_DIR}"
"${TERRAFORM_BIN}" init -backend=false

if aws s3api head-bucket --bucket "${bucket}" 2>/dev/null; then
  "${TERRAFORM_BIN}" import "module.terraform_artefact_bucket.aws_s3_bucket.bucket" "${bucket}" 2>/dev/null || true
  "${TERRAFORM_BIN}" import "module.terraform_artefact_bucket.aws_s3_bucket_versioning.versioning[0]" "${bucket}" 2>/dev/null || true
  "${TERRAFORM_BIN}" import "module.terraform_artefact_bucket.aws_s3_bucket_server_side_encryption_configuration.encryption" "${bucket}" 2>/dev/null || true
  "${TERRAFORM_BIN}" import "module.terraform_artefact_bucket.aws_s3_bucket_public_access_block.access_block[0]" "${bucket}" 2>/dev/null || true
  "${TERRAFORM_BIN}" import "module.terraform_artefact_bucket.aws_s3_bucket_request_payment_configuration.request_payment_configuration" "${bucket}" 2>/dev/null || true
fi

for env in "${ENVIRONMENTS[@]}"; do
  "${TERRAFORM_BIN}" import "aws_s3_object.environment_prefix[\"${env}\"]" "${bucket}/${env}/" 2>/dev/null || true
done

"${TERRAFORM_BIN}" apply -auto-approve
