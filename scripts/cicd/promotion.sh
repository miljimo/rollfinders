#!/usr/bin/env bash
set -euo pipefail

PROMOTION_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${PROMOTION_SCRIPT_DIR}/terraform-backend.sh"

PROMOTION_BUCKET="${PROMOTION_BUCKET:-$(terraform_backend_bucket)}"
PROMOTION_PREFIX="${PROMOTION_PREFIX:-deployment-promotions}"
AWS_REGION="${AWS_REGION:-eu-west-2}"

promotion_key() {
  local env="$1"
  echo "${PROMOTION_PREFIX}/${env}.json"
}

function promotion_write() {
  local env="$1"
  local status="${2:-success}"
  local image_uri="${IMAGE_URI:-}"
  local api_service_image_uri="${API_SERVICE_IMAGE_URI:-}"
  local user_service_image_uri="${USER_SERVICE_IMAGE_URI:-}"
  local payment_service_image_uri="${PAYMENT_SERVICE_IMAGE_URI:-}"
  local authorisation_service_image_uri="${AUTHORISATION_SERVICE_IMAGE_URI:-}"
  local subscription_service_image_uri="${SUBSCRIPTION_SERVICE_IMAGE_URI:-}"
  local commit="${BITBUCKET_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || true)}"
  local branch="${BITBUCKET_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"
  local file
  file="$(mktemp)"

  ENV_FOR_PROMOTION="${env}" STATUS_FOR_PROMOTION="${status}" IMAGE_FOR_PROMOTION="${image_uri}" API_SERVICE_IMAGE_FOR_PROMOTION="${api_service_image_uri}" USER_SERVICE_IMAGE_FOR_PROMOTION="${user_service_image_uri}" PAYMENT_SERVICE_IMAGE_FOR_PROMOTION="${payment_service_image_uri}" AUTHORISATION_SERVICE_IMAGE_FOR_PROMOTION="${authorisation_service_image_uri}" SUBSCRIPTION_SERVICE_IMAGE_FOR_PROMOTION="${subscription_service_image_uri}" COMMIT_FOR_PROMOTION="${commit}" BRANCH_FOR_PROMOTION="${branch}" python3 -c '
import json, os, time
print(json.dumps({
    "environment": os.environ["ENV_FOR_PROMOTION"],
    "status": os.environ["STATUS_FOR_PROMOTION"],
    "image_uri": os.environ["IMAGE_FOR_PROMOTION"],
    "api_service_image_uri": os.environ["API_SERVICE_IMAGE_FOR_PROMOTION"],
    "user_service_image_uri": os.environ["USER_SERVICE_IMAGE_FOR_PROMOTION"],
    "payment_service_image_uri": os.environ["PAYMENT_SERVICE_IMAGE_FOR_PROMOTION"],
    "authorisation_service_image_uri": os.environ["AUTHORISATION_SERVICE_IMAGE_FOR_PROMOTION"],
    "subscription_service_image_uri": os.environ["SUBSCRIPTION_SERVICE_IMAGE_FOR_PROMOTION"],
    "commit": os.environ["COMMIT_FOR_PROMOTION"],
    "branch": os.environ["BRANCH_FOR_PROMOTION"],
    "pipeline_uuid": os.environ.get("BITBUCKET_PIPELINE_UUID", ""),
    "recorded_at": int(time.time()),
}, indent=2))
' >"${file}"

  aws s3api put-object \
    --region "${AWS_REGION}" \
    --bucket "${PROMOTION_BUCKET}" \
    --key "$(promotion_key "${env}")" \
    --body "${file}" \
    --content-type "application/json" >/dev/null
  rm -f "${file}"
  echo "Promotion record written for ${env}."
}

promotion_require() {
  local source_env="$1"
  local target_env="$2"
  local file image api_service_image user_service_image payment_service_image authorisation_service_image subscription_service_image status
  file="$(mktemp)"

  if ! aws s3api get-object \
    --region "${AWS_REGION}" \
    --bucket "${PROMOTION_BUCKET}" \
    --key "$(promotion_key "${source_env}")" \
    "${file}" >/dev/null 2>&1; then
    rm -f "${file}"
    echo "${target_env} can only deploy after a successful ${source_env} deployment."
    return 1
  fi

  status="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("status", ""))' "${file}")"
  image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("image_uri", ""))' "${file}")"
  api_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("api_service_image_uri", ""))' "${file}")"
  user_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("user_service_image_uri", ""))' "${file}")"
  payment_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("payment_service_image_uri", ""))' "${file}")"
  authorisation_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("authorisation_service_image_uri", ""))' "${file}")"
  subscription_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("subscription_service_image_uri", ""))' "${file}")"
  if [[ "${status}" != "success" || -z "${image}" || -z "${api_service_image}" || -z "${user_service_image}" || -z "${payment_service_image}" || -z "${authorisation_service_image}" || -z "${subscription_service_image}" ]]; then
    cat "${file}"
    rm -f "${file}"
    echo "${target_env} promotion is blocked because ${source_env} does not have a successful deploy record with app, api, users, payments, authorisation, and subscriptions images."
    return 1
  fi

  {
    echo "IMAGE_URI=${image}"
    echo "API_SERVICE_IMAGE_URI=${api_service_image}"
    echo "USER_SERVICE_IMAGE_URI=${user_service_image}"
    echo "PAYMENT_SERVICE_IMAGE_URI=${payment_service_image}"
    echo "AUTHORISATION_SERVICE_IMAGE_URI=${authorisation_service_image}"
    echo "SUBSCRIPTION_SERVICE_IMAGE_URI=${subscription_service_image}"
  } >"${PROJECT_DIR:-$(pwd)}/image.env"
  rm -f "${file}"
  echo "${target_env} will promote images from ${source_env}: ${image}, ${api_service_image}, ${user_service_image}, ${payment_service_image}, ${authorisation_service_image}, ${subscription_service_image}"
}
