#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-west-2}"
export AWS_REGION
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-${AWS_REGION}}"

if [[ -n "${BITBUCKET_STEP_OIDC_TOKEN:-}" ]]; then
  if [[ -z "${AWS_ROLE_ARN:-}" ]]; then
    echo "AWS_ROLE_ARN must be set when using Bitbucket OIDC."
    exit 1
  fi

  oidc_token_file="${BITBUCKET_CLONE_DIR:-$(pwd)}/.bitbucket-oidc-token"
  printf '%s' "${BITBUCKET_STEP_OIDC_TOKEN}" > "${oidc_token_file}"

  export AWS_WEB_IDENTITY_TOKEN_FILE="${oidc_token_file}"
  export AWS_ROLE_ARN
fi
