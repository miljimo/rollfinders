#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/scripts/build.sh"
"${ROOT_DIR}/scripts/terraform-validate.sh"
"${ROOT_DIR}/scripts/docker-build.sh"

echo "Local CI completed."
