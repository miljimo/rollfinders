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
  local authorisation_service_image_uri="${AUTHORISATION_SERVICE_IMAGE_URI:-}"
  local academy_service_image_uri="${ACADEMY_SERVICE_IMAGE_URI:-}"
  local organisation_service_image_uri="${ORGANISATION_SERVICE_IMAGE_URI:-}"
  local course_service_image_uri="${COURSE_SERVICE_IMAGE_URI:-}"
  local booking_service_image_uri="${BOOKING_SERVICE_IMAGE_URI:-}"
  local payment_service_image_uri="${PAYMENT_SERVICE_IMAGE_URI:-}"
  local subscription_service_image_uri="${SUBSCRIPTION_SERVICE_IMAGE_URI:-}"
  local notification_service_image_uri="${NOTIFICATION_SERVICE_IMAGE_URI:-}"
  local analytics_service_image_uri="${ANALYTICS_SERVICE_IMAGE_URI:-}"
  local access_key_service_image_uri="${ACCESS_KEY_SERVICE_IMAGE_URI:-}"
  local wallet_service_image_uri="${WALLET_SERVICE_IMAGE_URI:-}"
  local transfer_service_image_uri="${TRANSFER_SERVICE_IMAGE_URI:-}"
  local pricing_service_image_uri="${PRICING_SERVICE_IMAGE_URI:-}"
  local commit="${BITBUCKET_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || true)}"
  local branch="${BITBUCKET_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"
  local file
  file="$(mktemp)"

  ENV_FOR_PROMOTION="${env}" STATUS_FOR_PROMOTION="${status}" IMAGE_FOR_PROMOTION="${image_uri}" API_SERVICE_IMAGE_FOR_PROMOTION="${api_service_image_uri}" USER_SERVICE_IMAGE_FOR_PROMOTION="${user_service_image_uri}" AUTHORISATION_SERVICE_IMAGE_FOR_PROMOTION="${authorisation_service_image_uri}" ACADEMY_SERVICE_IMAGE_FOR_PROMOTION="${academy_service_image_uri}" ORGANISATION_SERVICE_IMAGE_FOR_PROMOTION="${organisation_service_image_uri}" COURSE_SERVICE_IMAGE_FOR_PROMOTION="${course_service_image_uri}" BOOKING_SERVICE_IMAGE_FOR_PROMOTION="${booking_service_image_uri}" PAYMENT_SERVICE_IMAGE_FOR_PROMOTION="${payment_service_image_uri}" SUBSCRIPTION_SERVICE_IMAGE_FOR_PROMOTION="${subscription_service_image_uri}" NOTIFICATION_SERVICE_IMAGE_FOR_PROMOTION="${notification_service_image_uri}" ANALYTICS_SERVICE_IMAGE_FOR_PROMOTION="${analytics_service_image_uri}" ACCESS_KEY_SERVICE_IMAGE_FOR_PROMOTION="${access_key_service_image_uri}" WALLET_SERVICE_IMAGE_FOR_PROMOTION="${wallet_service_image_uri}" TRANSFER_SERVICE_IMAGE_FOR_PROMOTION="${transfer_service_image_uri}" PRICING_SERVICE_IMAGE_FOR_PROMOTION="${pricing_service_image_uri}" COMMIT_FOR_PROMOTION="${commit}" BRANCH_FOR_PROMOTION="${branch}" python3 -c '
import json, os, time
print(json.dumps({
    "environment": os.environ["ENV_FOR_PROMOTION"],
    "status": os.environ["STATUS_FOR_PROMOTION"],
    "image_uri": os.environ["IMAGE_FOR_PROMOTION"],
    "api_service_image_uri": os.environ["API_SERVICE_IMAGE_FOR_PROMOTION"],
    "user_service_image_uri": os.environ["USER_SERVICE_IMAGE_FOR_PROMOTION"],
    "authorisation_service_image_uri": os.environ["AUTHORISATION_SERVICE_IMAGE_FOR_PROMOTION"],
    "academy_service_image_uri": os.environ["ACADEMY_SERVICE_IMAGE_FOR_PROMOTION"],
    "organisation_service_image_uri": os.environ["ORGANISATION_SERVICE_IMAGE_FOR_PROMOTION"],
    "course_service_image_uri": os.environ["COURSE_SERVICE_IMAGE_FOR_PROMOTION"],
    "booking_service_image_uri": os.environ["BOOKING_SERVICE_IMAGE_FOR_PROMOTION"],
    "payment_service_image_uri": os.environ["PAYMENT_SERVICE_IMAGE_FOR_PROMOTION"],
    "subscription_service_image_uri": os.environ["SUBSCRIPTION_SERVICE_IMAGE_FOR_PROMOTION"],
    "notification_service_image_uri": os.environ["NOTIFICATION_SERVICE_IMAGE_FOR_PROMOTION"],
    "analytics_service_image_uri": os.environ["ANALYTICS_SERVICE_IMAGE_FOR_PROMOTION"],
    "access_key_service_image_uri": os.environ["ACCESS_KEY_SERVICE_IMAGE_FOR_PROMOTION"],
    "wallet_service_image_uri": os.environ["WALLET_SERVICE_IMAGE_FOR_PROMOTION"],
    "transfer_service_image_uri": os.environ["TRANSFER_SERVICE_IMAGE_FOR_PROMOTION"],
    "pricing_service_image_uri": os.environ["PRICING_SERVICE_IMAGE_FOR_PROMOTION"],
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
  local file image api_service_image user_service_image authorisation_service_image academy_service_image organisation_service_image course_service_image booking_service_image payment_service_image subscription_service_image notification_service_image analytics_service_image access_key_service_image wallet_service_image transfer_service_image pricing_service_image status
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
  authorisation_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("authorisation_service_image_uri", ""))' "${file}")"
  academy_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("academy_service_image_uri", ""))' "${file}")"
  organisation_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("organisation_service_image_uri", ""))' "${file}")"
  course_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("course_service_image_uri", ""))' "${file}")"
  booking_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("booking_service_image_uri", ""))' "${file}")"
  payment_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("payment_service_image_uri", ""))' "${file}")"
  subscription_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("subscription_service_image_uri", ""))' "${file}")"
  notification_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("notification_service_image_uri", ""))' "${file}")"
  analytics_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("analytics_service_image_uri", ""))' "${file}")"
  access_key_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("access_key_service_image_uri", ""))' "${file}")"
  wallet_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("wallet_service_image_uri", ""))' "${file}")"
  transfer_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("transfer_service_image_uri", ""))' "${file}")"
  pricing_service_image="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("pricing_service_image_uri", ""))' "${file}")"
  if [[ "${status}" != "success" || -z "${image}" || -z "${api_service_image}" || -z "${user_service_image}" || -z "${authorisation_service_image}" || -z "${academy_service_image}" || -z "${organisation_service_image}" || -z "${course_service_image}" || -z "${booking_service_image}" || -z "${payment_service_image}" || -z "${subscription_service_image}" || -z "${notification_service_image}" || -z "${analytics_service_image}" || -z "${access_key_service_image}" || -z "${wallet_service_image}" || -z "${transfer_service_image}" || -z "${pricing_service_image}" ]]; then
    cat "${file}"
    rm -f "${file}"
    echo "${target_env} promotion is blocked because ${source_env} does not have a successful deploy record with the full app and backend service image set."
    return 1
  fi

  {
    echo "IMAGE_URI=${image}"
    echo "API_SERVICE_IMAGE_URI=${api_service_image}"
    echo "USER_SERVICE_IMAGE_URI=${user_service_image}"
    echo "AUTHORISATION_SERVICE_IMAGE_URI=${authorisation_service_image}"
    echo "ACADEMY_SERVICE_IMAGE_URI=${academy_service_image}"
    echo "ORGANISATION_SERVICE_IMAGE_URI=${organisation_service_image}"
    echo "COURSE_SERVICE_IMAGE_URI=${course_service_image}"
    echo "BOOKING_SERVICE_IMAGE_URI=${booking_service_image}"
    echo "PAYMENT_SERVICE_IMAGE_URI=${payment_service_image}"
    echo "SUBSCRIPTION_SERVICE_IMAGE_URI=${subscription_service_image}"
    echo "NOTIFICATION_SERVICE_IMAGE_URI=${notification_service_image}"
    echo "ANALYTICS_SERVICE_IMAGE_URI=${analytics_service_image}"
    echo "ACCESS_KEY_SERVICE_IMAGE_URI=${access_key_service_image}"
    echo "WALLET_SERVICE_IMAGE_URI=${wallet_service_image}"
    echo "TRANSFER_SERVICE_IMAGE_URI=${transfer_service_image}"
    echo "PRICING_SERVICE_IMAGE_URI=${pricing_service_image}"
  } >"${PROJECT_DIR:-$(pwd)}/image.env"
  rm -f "${file}"
  echo "${target_env} will promote images from ${source_env}: ${image}, ${api_service_image}, ${user_service_image}, ${authorisation_service_image}, ${academy_service_image}, ${organisation_service_image}, ${course_service_image}, ${booking_service_image}, ${payment_service_image}, ${subscription_service_image}, ${notification_service_image}, ${analytics_service_image}, ${access_key_service_image}, ${wallet_service_image}, ${transfer_service_image}, ${pricing_service_image}"
}
