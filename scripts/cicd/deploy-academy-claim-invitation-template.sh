#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

AWS_REGION="${AWS_REGION:-eu-west-2}"
TEMPLATE_NAME="academy-claim-invitation"
TEMPLATE_SOURCE="${PROJECT_DIR}/apps/portal/src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html"
S3_BUCKET="${ACADEMY_CLAIM_INVITATION_TEMPLATE_BUCKET:-rollfinders}"
S3_KEY="${ACADEMY_CLAIM_INVITATION_TEMPLATE_KEY:-mails/invitations/academy-claim-invitation.html}"
CONTENT_TYPE="text/html; charset=utf-8"
MAX_TEMPLATE_BYTES="${ACADEMY_CLAIM_INVITATION_TEMPLATE_MAX_BYTES:-102400}"
VALIDATE_ONLY=false

required_placeholders=(
  "{{academyName}}"
  "{{academyProfileUrl}}"
  "{{claimInvitationUrl}}"
  "{{recipientEmail}}"
  "{{supportEmail}}"
  "{{currentYear}}"
)

fail() {
  echo "Academy claim invitation template deploy failed: $*" >&2
  exit 1
}

if [[ "${1:-}" == "--validate-only" ]]; then
  VALIDATE_ONLY=true
elif [[ $# -gt 0 ]]; then
  fail "unknown argument: $1"
fi

validate_template() {
  [[ -f "${TEMPLATE_SOURCE}" ]] || fail "missing canonical template at ${TEMPLATE_SOURCE}"
  [[ -s "${TEMPLATE_SOURCE}" ]] || fail "template is empty: ${TEMPLATE_SOURCE}"

  local byte_count
  byte_count="$(wc -c <"${TEMPLATE_SOURCE}" | tr -d '[:space:]')"
  [[ "${byte_count}" -le "${MAX_TEMPLATE_BYTES}" ]] || fail "template is ${byte_count} bytes, above ${MAX_TEMPLATE_BYTES} byte limit"

  local placeholder
  for placeholder in "${required_placeholders[@]}"; do
    if ! grep -Fq "${placeholder}" "${TEMPLATE_SOURCE}"; then
      fail "missing required placeholder ${placeholder}"
    fi
  done

  if grep -Einq 'https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?|https?://[^"'\''[:space:]<>]*(dev|staging|test|local)[.-]rollfinders\.com|https?://[^"'\''[:space:]<>]*\.local(:[0-9]+)?' "${TEMPLATE_SOURCE}"; then
    fail "template contains local, staging-only, or development URL"
  fi

  if grep -Einq '<script[[:space:]>]|javascript:|<link[^>]+rel=["'\'']?stylesheet|@font-face|[[:space:]]on[a-z]+[[:space:]]*=' "${TEMPLATE_SOURCE}"; then
    fail "template contains unsafe email HTML such as scripts, external stylesheets, web fonts, javascript URLs, or event handlers"
  fi
}

object_metadata() {
  local git_sha build_id checksum
  git_sha="${BITBUCKET_COMMIT:-${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}}"
  build_id="${BITBUCKET_BUILD_NUMBER:-${BITBUCKET_PIPELINE_UUID:-${GITHUB_RUN_ID:-local}}}"
  checksum="$1"

  printf 'template-name=%s,git-sha=%s,build-id=%s,content-sha256=%s' \
    "${TEMPLATE_NAME}" \
    "${git_sha}" \
    "${build_id}" \
    "${checksum}"
}

upload_template() {
  local source_checksum uploaded_file uploaded_checksum put_result version_id metadata head_result uploaded_content_type
  source_checksum="$(sha256sum "${TEMPLATE_SOURCE}" | awk '{print $1}')"
  uploaded_file="$(mktemp)"
  trap 'rm -f "${uploaded_file}"' RETURN
  metadata="$(object_metadata "${source_checksum}")"

  put_result="$(
    aws s3api put-object \
      --region "${AWS_REGION}" \
      --bucket "${S3_BUCKET}" \
      --key "${S3_KEY}" \
      --body "${TEMPLATE_SOURCE}" \
      --content-type "${CONTENT_TYPE}" \
      --metadata "${metadata}" \
      --query '{version_id:VersionId}' \
      --output json
  )" || fail "S3 upload failed for s3://${S3_BUCKET}/${S3_KEY}"

  aws s3api get-object \
    --region "${AWS_REGION}" \
    --bucket "${S3_BUCKET}" \
    --key "${S3_KEY}" \
    "${uploaded_file}" >/dev/null || fail "unable to fetch uploaded template for checksum verification"

  uploaded_checksum="$(sha256sum "${uploaded_file}" | awk '{print $1}')"
  [[ "${uploaded_checksum}" == "${source_checksum}" ]] || fail "checksum mismatch after upload: source ${source_checksum}, uploaded ${uploaded_checksum}"

  head_result="$(
    aws s3api head-object \
      --region "${AWS_REGION}" \
      --bucket "${S3_BUCKET}" \
      --key "${S3_KEY}" \
      --query '{content_type:ContentType}' \
      --output json
  )" || fail "unable to verify uploaded template metadata"
  uploaded_content_type="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("content_type", ""))' <<<"${head_result}")"
  [[ "${uploaded_content_type}" == "${CONTENT_TYPE}" ]] || fail "uploaded content type is ${uploaded_content_type}, expected ${CONTENT_TYPE}"

  version_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("version_id") or "none")' <<<"${put_result}")"

  cat <<EOF
Academy claim invitation template uploaded.
S3 URI: s3://${S3_BUCKET}/${S3_KEY}
Content-Type: ${CONTENT_TYPE}
SHA-256: ${source_checksum}
Version ID: ${version_id}
EOF
}

validate_template
if [[ "${VALIDATE_ONLY}" == "true" ]]; then
  echo "Academy claim invitation template validation passed."
  exit 0
fi
upload_template
