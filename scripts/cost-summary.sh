#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-west-2}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Active RollFinders resources by environment"
echo

for env in dev staging production; do
  echo "================================================"
  echo "${env}"
  echo "================================================"
  if "${ROOT_DIR}/scripts/inventory.sh" "${env}"; then
    :
  else
    echo "No Terraform inventory available for ${env}."
  fi
  echo
done

cat <<EOF
Estimated monthly cost drivers:
- NAT Gateway
- Application Load Balancer
- ECS Fargate tasks
- RDS PostgreSQL
- CloudFront
- S3 storage
- Route53 hosted zone and DNS queries
- CloudWatch logs

Use AWS Cost Explorer for account-level estimates:
https://console.aws.amazon.com/cost-management/home

Region: ${AWS_REGION}
EOF
