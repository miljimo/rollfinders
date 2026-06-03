#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="${ROOT_DIR}/terraform"
TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.10.5}"
LOCAL_BIN_DIR="${ROOT_DIR}/.bin"
TERRAFORM_BIN="${TERRAFORM_BIN:-${LOCAL_BIN_DIR}/terraform}"

if ! command -v "${TERRAFORM_BIN}" >/dev/null 2>&1; then
  if command -v terraform >/dev/null 2>&1; then
    TERRAFORM_BIN="terraform"
  else
    echo "==> Installing Terraform ${TERRAFORM_VERSION} locally"
    mkdir -p "${LOCAL_BIN_DIR}"
    curl -fsSLo "${LOCAL_BIN_DIR}/terraform.zip" "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
    python3 -m zipfile -e "${LOCAL_BIN_DIR}/terraform.zip" "${LOCAL_BIN_DIR}"
    chmod +x "${LOCAL_BIN_DIR}/terraform"
    rm -f "${LOCAL_BIN_DIR}/terraform.zip"
  fi
fi

echo "==> Checking Terraform formatting"
"${TERRAFORM_BIN}" fmt -check "${TERRAFORM_DIR}" "${TERRAFORM_DIR}/bootstrap"

echo "==> Validating application Terraform"
cd "${TERRAFORM_DIR}"
"${TERRAFORM_BIN}" init -backend=false
"${TERRAFORM_BIN}" validate

echo "==> Validating Terraform bootstrap"
cd "${TERRAFORM_DIR}/bootstrap"
"${TERRAFORM_BIN}" init -backend=false
"${TERRAFORM_BIN}" validate

echo "Terraform validation completed."
