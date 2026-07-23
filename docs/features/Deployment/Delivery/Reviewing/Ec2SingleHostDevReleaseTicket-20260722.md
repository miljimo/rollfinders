# Name: RELEASE-20260722-EC2-DEV - Deploy RollFinders Services To A Single EC2 Host In Dev

## Feature / Component

- Feature: Low-cost EC2 runtime migration
- Component: Terraform, GitHub Actions deployment, EC2 Docker Compose runtime, ALB target routing
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: AWS dev access, Terraform backend access, GitHub Actions AWS OIDC role, dev deployment approval
- Source PRD: `docs/guidelines/DEPLOYMENT.md`
- Ticket status: Reviewing, created on 2026-07-22

## Goal

Deploy the RollFinders application and backend service containers to one Terraform-managed EC2 host in the dev environment before any production EC2 migration.

## Scope

The release agent must:

- Release the current `master` EC2 single-host runtime changes to `dev` only.
- Provision the dev EC2 app host through Terraform using `enable_ec2_app_host = true`.
- Keep dev ECS/Fargate tasks stopped with `desired_count = 0` after the EC2 host is serving.
- Keep analytics disabled in dev with `enable_analytics_service = false`.
- Deploy all required application and domain service images to the EC2 host using `scripts/cicd/deploy-ec2-app.sh`.
- Verify the existing ALB routes dev traffic to the EC2 host on port `3000`.
- Record Terraform plan/apply, SSM deployment, and smoke-test evidence.

The release agent must not:

- Switch production to EC2 in this release.
- Destroy ECS modules, ECS task definitions, ECR repositories, RDS, ALB, Route53, or certificates.
- Delete analytics data or analytics migrations.
- Seed production data.
- Apply unrelated Terraform changes outside the dev EC2 runtime path.

## Implementation Notes

- Dev is the first validation environment for the EC2 runtime.
- Production remains ECS-primary in Terraform during this ticket:
  - `enable_ec2_app_host = false`
  - `desired_count = 2`
- Dev EC2 runtime configuration:
  - `enable_ec2_app_host = true`
  - `desired_count = 0`
  - `enable_analytics_service = false`
  - `ec2_app_instance_type = "t4g.medium"`
  - `ec2_app_root_volume_size = 30`
- The EC2 host is managed by `infrastructure/terraform/modules/ec2_app_host`.
- The EC2 host uses SSM Run Command for deployments; no SSH key is required.
- Runtime environment values come from existing SSM parameters under:
  - `/rollfinder-dev/app`
  - `/rollfinder-dev/super-admin`
- The existing ECS Terraform remains available for rollback by setting dev `desired_count` back above `0` and disabling `enable_ec2_app_host`.

## Acceptance Criteria

- WHEN Terraform is planned for dev, THEN it creates or updates one EC2 app host, attaches it to the existing ALB target group, and sets ECS desired count to `0`.
- WHEN the dev deployment runs, THEN `scripts/cicd/deploy-ec2-app.sh` completes successfully through SSM.
- WHEN the EC2 deployment completes, THEN Docker Compose is running the portal plus API, users, authorisation, academy, organisation, courses, booking, payments, subscriptions, notification, access-keys, wallet, transfer, and pricing containers.
- WHEN analytics is disabled, THEN no analytics container is required, built, or smoke-tested for dev.
- WHEN dev smoke checks run, THEN `/api/health` and `/api/health?deep=1` pass through the dev ALB URL.
- WHEN production tfvars are inspected, THEN production is not switched to EC2 by this release.

## Regression / Compatibility Tests

- Confirm `terraform fmt -check` passes for touched Terraform files.
- Confirm `terraform init -backend=false && terraform validate` passes.
- Confirm `bash -n` passes for changed deployment scripts.
- Confirm `npm run typecheck` passes.
- Confirm GitHub workflow YAML parses.
- Confirm dev ALB target health is healthy after the EC2 host deployment.
- Confirm dev public pages load:
  - `/api/health`
  - `/`
  - `/open-mats`
  - `/academies`
  - `/login`
  - `/mobile`
- Confirm dashboard login still reaches the API gateway and domain services.

## Deployment Steps

1. Confirm the source branch and commit:

   ```bash
   git status --short
   git rev-parse --short HEAD
   ```

2. Validate local source:

   ```bash
   bash -n scripts/cicd/build.sh scripts/cicd/build-go-services.sh scripts/cicd/deploy-environment.sh scripts/cicd/deploy-ec2-app.sh scripts/cicd/smoke.sh
   terraform fmt -check infrastructure/terraform/main.tf infrastructure/terraform/variables.tf infrastructure/terraform/outputs.tf infrastructure/terraform/environments/dev/common.tfvars infrastructure/terraform/modules/ec2_app_host/*.tf
   terraform -chdir=infrastructure/terraform init -backend=false
   terraform -chdir=infrastructure/terraform validate
   npm run typecheck
   ```

3. Build and push dev images:

   ```bash
   export ENVIRONMENT_NAME=dev
   export FORCE_SERVICE_REDEPLOY=true
   export SERVICE_REDEPLOY_TARGET=all
   scripts/cicd/prepare-ecr.sh
   scripts/cicd/build.sh
   scripts/cicd/build-go-services.sh
   ```

4. Deploy dev Terraform and EC2 runtime:

   ```bash
   export ENVIRONMENT_NAME=dev
   scripts/cicd/deploy-environment.sh
   ```

5. Verify dev outputs:

   ```bash
   terraform -chdir=infrastructure/terraform output ec2_app_instance_id
   terraform -chdir=infrastructure/terraform output frontend_url
   ```

6. Verify EC2 deployment status:

   ```bash
   aws ssm describe-instance-information --region eu-west-2
   aws elbv2 describe-target-health --region eu-west-2 --target-group-arn "$(terraform -chdir=infrastructure/terraform output -raw target_group_arn)"
   ```

7. Smoke test dev:

   ```bash
   export ENVIRONMENT_NAME=dev
   scripts/cicd/smoke.sh
   ```

## Rollback Plan

- If the EC2 host fails to provision, revert dev `enable_ec2_app_host` to `false` and set dev `desired_count = 1`, then redeploy dev Terraform.
- If Docker Compose fails on the EC2 host, inspect the SSM command output and container logs, then rerun `scripts/cicd/deploy-ec2-app.sh`.
- If the ALB target is unhealthy, detach the EC2 target by disabling `enable_ec2_app_host`, restore dev ECS desired count, and redeploy.
- No database rollback is expected because this release does not introduce schema changes.

## Out Of Scope

- Production EC2 cutover.
- Production DNS changes.
- RDS resizing.
- Removing ECS Terraform modules.
- Removing analytics code or stored analytics data.
