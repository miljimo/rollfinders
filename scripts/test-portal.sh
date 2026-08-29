#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_dir}"

tests=()
while IFS= read -r -d '' test_file; do
  # Cross-repository contracts belong to the standalone API/infrastructure
  # suites. The portal unit suite must be runnable from this checkout alone.
  if grep -Eq 'apps/backend_api|infrastructure/terraform/modules/' "${test_file}"; then
    continue
  fi
  tests+=("${test_file}")
done < <(find apps/portal/src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0)

if [[ ${#tests[@]} -eq 0 ]]; then
  echo "No standalone portal unit tests were found."
  exit 1
fi

node --import tsx --test "${tests[@]}"
