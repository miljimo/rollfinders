#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_LOCK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DEPLOYMENT_LOCK_SCRIPT_DIR}/terraform-backend.sh"

LOCK_BUCKET="${DEPLOYMENT_LOCK_BUCKET:-$(terraform_backend_bucket)}"
LOCK_KEY="${DEPLOYMENT_LOCK_KEY:-deployment-lock/global.lock}"
LOCK_TTL_SECONDS="${DEPLOYMENT_LOCK_TTL_SECONDS:-3600}"
AWS_REGION="${AWS_REGION:-eu-west-2}"

deployment_lock_payload() {
  python3 - <<PY
import json, os, time
payload = {
    "environment": os.environ.get("ENVIRONMENT_NAME", "dev"),
    "pipeline_uuid": os.environ.get("BITBUCKET_PIPELINE_UUID", ""),
    "step_uuid": os.environ.get("BITBUCKET_STEP_UUID", ""),
    "commit": os.environ.get("BITBUCKET_COMMIT", ""),
    "branch": os.environ.get("BITBUCKET_BRANCH", ""),
    "created_at": int(time.time()),
    "expires_at": int(time.time()) + int(os.environ.get("LOCK_TTL_SECONDS", "${LOCK_TTL_SECONDS}")),
}
print(json.dumps(payload, separators=(",", ":")))
PY
}

deployment_lock_is_stale() {
  local lock_json now expires_at
  lock_json="$(aws s3api get-object --region "${AWS_REGION}" --bucket "${LOCK_BUCKET}" --key "${LOCK_KEY}" /dev/stdout 2>/dev/null || true)"
  if [[ -z "${lock_json}" ]]; then
    return 1
  fi

  now="$(date +%s)"
  expires_at="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("expires_at", 0))' <<<"${lock_json}" 2>/dev/null || echo 0)"
  [[ "${expires_at}" =~ ^[0-9]+$ ]] && (( expires_at < now ))
}

deployment_lock_acquire() {
  local lock_file
  lock_file="$(mktemp)"
  deployment_lock_payload >"${lock_file}"

  if aws s3api put-object \
    --region "${AWS_REGION}" \
    --bucket "${LOCK_BUCKET}" \
    --key "${LOCK_KEY}" \
    --body "${lock_file}" \
    --content-type "application/json" \
    --if-none-match "*" >/dev/null 2>&1; then
    rm -f "${lock_file}"
    echo "Deployment lock acquired: s3://${LOCK_BUCKET}/${LOCK_KEY}"
    return 0
  fi

  if deployment_lock_is_stale; then
    echo "Existing deployment lock is stale; replacing it."
    aws s3api delete-object --region "${AWS_REGION}" --bucket "${LOCK_BUCKET}" --key "${LOCK_KEY}" >/dev/null
    aws s3api put-object \
      --region "${AWS_REGION}" \
      --bucket "${LOCK_BUCKET}" \
      --key "${LOCK_KEY}" \
      --body "${lock_file}" \
      --content-type "application/json" \
      --if-none-match "*" >/dev/null
    rm -f "${lock_file}"
    echo "Deployment lock acquired: s3://${LOCK_BUCKET}/${LOCK_KEY}"
    return 0
  fi

  rm -f "${lock_file}"
  echo "Another deployment is already running. Lock: s3://${LOCK_BUCKET}/${LOCK_KEY}"
  aws s3api get-object --region "${AWS_REGION}" --bucket "${LOCK_BUCKET}" --key "${LOCK_KEY}" /dev/stdout 2>/dev/null || true
  echo
  return 1
}

deployment_lock_release() {
  aws s3api delete-object --region "${AWS_REGION}" --bucket "${LOCK_BUCKET}" --key "${LOCK_KEY}" >/dev/null 2>&1 || true
  echo "Deployment lock released."
}
