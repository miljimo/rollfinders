#!/usr/bin/env bash
set -euo pipefail

export TF_VAR_super_admin_email="${TF_VAR_super_admin_email:-${SUPER_ADMIN_EMAIL:-${DEFAULT_SUPER_ADMIN_EMAIL:-admin@rollfinder.com}}}"
export TF_VAR_super_admin_password="${TF_VAR_super_admin_password:-${SUPER_ADMIN_PASSWORD:-${DEFAULT_SUPER_ADMIN_PASSWORD:-admin}}}"
export TF_VAR_super_admin_name="${TF_VAR_super_admin_name:-${SUPER_ADMIN_NAME:-${DEFAULT_SUPER_ADMIN_NAME:-RollFinder Admin}}}"
