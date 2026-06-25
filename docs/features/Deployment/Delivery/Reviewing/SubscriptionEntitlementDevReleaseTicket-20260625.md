# Release Ticket: Subscription Entitlement Enforcement To Developer Environment

## Status

Reviewing. Prepared for developer-environment deployment on 2026-06-25. Not deployed from this workstation because AWS credentials are not configured locally.

## Release Candidate

* Source branch: `master`
* Target environment: `dev`
* Current release candidate commit: `ae52a6f Implement subscription billing boundary and deployment fixes`
* Included entitlement baseline commit: `34d876d Implement subscription entitlement enforcement`
* Release preparation state: committed locally on `master`.
* Requested date: 2026-06-25
* Release owner request: Product owner request in Codex session

## Purpose

Deploy the subscription entitlement patch to the developer environment so API Gateway can enforce plan-controlled features before proxying downstream service calls.

This release includes:

* Subscription owner policies for `academy`, `organisation`, `practitioner`, `partner`, `platform`, `application`, and `user`.
* Product feature `feature_key` and `subscription_controlled` fields.
* Subscription Service entitlement endpoint: `POST /v1/entitlements/check`.
* API Gateway route metadata for subscription-controlled routes.
* API Gateway IAM-then-subscription enforcement for the first commercial route set.
* Portal feature management fields for feature keys and subscription-controlled access.
* Authorisation seed fix granting `user.search` to roles that can list managed users.
* Deployment-script fixes for the current Terraform path and service image release metadata.

## Deployment Code Readiness

### CI/Terraform Path Fix

Deployment scripts now use:

```text
infrastructure/terraform
```

instead of the removed root-level `terraform` directory.

Updated paths:

* `scripts/cicd/deploy-environment.sh`
* `scripts/cicd/prepare-ecr.sh`
* `scripts/cicd/bootstrap-state.sh`
* `scripts/cicd/migrate.sh`
* `scripts/cicd/seed.sh`
* `scripts/cicd/deploy.sh`
* `scripts/cicd/smoke.sh`
* `scripts/cicd/ensure-super-admin.sh`
* `bitbucket-pipelines.yml`

### Service Image Release Metadata

The dev release pipeline now requires and records image metadata for:

```text
IMAGE_URI
API_SERVICE_IMAGE_URI
USER_SERVICE_IMAGE_URI
PAYMENT_SERVICE_IMAGE_URI
AUTHORISATION_SERVICE_IMAGE_URI
SUBSCRIPTION_SERVICE_IMAGE_URI
```

`scripts/cicd/build-go-services.sh` now builds service Dockerfiles from the repository root context, which matches the Dockerfiles' `COPY apps/backend_api ...` expectations.

The build script also emits API Gateway and Subscription Service images, which are required by this release.

### Migrations

The deployment image includes and runs service SQL migrations through:

```bash
scripts/cicd/run-service-sql-migrations.sh
```

This release requires the authorisation and subscriptions migrations to run in dev:

* `apps/backend_api/migrations/authorisation/001_core_schema.sql`
* `apps/backend_api/migrations/authorisation/procedures/001_seedAuthorisationCatalog.sql`
* `apps/backend_api/migrations/subscriptions/001_core_schema.sql`

## Pre-Deployment Validation

Completed locally on 2026-06-25:

```bash
bash -n scripts/cicd/deploy-environment.sh scripts/cicd/prepare-ecr.sh scripts/cicd/bootstrap-state.sh scripts/cicd/migrate.sh scripts/cicd/seed.sh scripts/cicd/deploy.sh scripts/cicd/smoke.sh scripts/cicd/ensure-super-admin.sh scripts/cicd/build-go-services.sh scripts/cicd/run-service-sql-migrations.sh scripts/cicd/promotion.sh
cd apps/backend_api && go test ./...
npm run typecheck
npm run build
TF_DATA_DIR=/tmp/rollfinder-tfdata-dev-release terraform -chdir=infrastructure/terraform init -backend=false
TF_DATA_DIR=/tmp/rollfinder-tfdata-dev-release terraform -chdir=infrastructure/terraform validate
node --import tsx --test apps/portal/src/lib/__tests__/deployment-contracts.test.ts apps/portal/src/lib/__tests__/email-operations-contracts.test.ts
docker build -f apps/backend_api/containers/api/Dockerfile -t rollfinder-release-check-api:local .
docker build -f apps/backend_api/containers/subscriptions/Dockerfile -t rollfinder-release-check-subscriptions:local .
```

Results:

* Shell syntax checks passed.
* Backend Go tests passed.
* Portal typecheck passed.
* Portal production build passed.
* Terraform validation passed using isolated `TF_DATA_DIR`.
* Deployment and email operation contract tests passed: 21/21.
* API Gateway Docker image build passed locally.
* Subscription Service Docker image build passed locally.

### Full Unit Test Status

`npm run test` was run and did not pass. The release-specific deployment contracts were fixed and pass, but the full suite still contains existing unrelated product-contract failures, including:

* `server-only` import failure in `PlatformAdminActivitySummaryPanel.test.tsx`.
* Existing unified dashboard route contract assertions.
* Existing billing subscription journey contract assertions.
* Existing course analytics/payment integration contract assertions.

These failures should be triaged separately unless release approval requires the entire historical contract suite to be green before dev deployment.

## Deployment Attempt

Local AWS deployment could not be attempted:

```text
aws: [ERROR]: An error occurred (NoCredentials): Unable to locate credentials.
```

Dev deployment should be run from Bitbucket or a shell with valid AWS/OIDC credentials.

## Dev Deployment Command

Preferred Bitbucket custom pipeline:

```text
deploy-dev-monolithic-services
```

Recommended variables:

```text
FORCE_SERVICE_REDEPLOY=true
SERVICE_REDEPLOY_TARGET=all
ENVIRONMENT_NAME=dev
```

Expected pipeline order:

1. Static validation.
2. Build web image.
3. Build Go service images.
4. Terraform plan/apply against `infrastructure/terraform/environments/dev/common.tfvars`.
5. Run service SQL migrations and Prisma migrations.
6. Redeploy ECS task/service.
7. Ensure super admin.
8. Run dev seed.
9. Smoke `/api/health` and `/api/health?deep=1`.

## Manual Smoke Checks

After dev deployment, validate:

* `https://dev.rollfinders.com/api/health` returns HTTP 200.
* `https://dev.rollfinders.com/api/health?deep=1` returns HTTP 200 and database ok.
* Login succeeds for the dev super admin.
* `/dashboard/users` loads and lists users without `Not authorised`.
* `/dashboard/subscriptions` loads features, plans, and subscribers.
* Creating/editing a feature persists `feature_key` and `subscription_controlled`.
* `GET /v1/users?limit=10&offset=0` through API Gateway succeeds for a super admin.
* A subscription-controlled route denies before downstream proxy when entitlement is missing.
* A subscription-controlled route allows when IAM allows and the active plan includes the feature.

## Database Verification

Run after migration:

```sql
SELECT r.key, resource.name
FROM authorisation.roles r
JOIN authorisation.role_permissions rp ON rp.role_id = r.id
JOIN authorisation.permissions p ON p.id = rp.permission_id
JOIN authorisation.resources resource ON resource.id = p.resource_id
WHERE resource.name = 'user.search'
ORDER BY r.key;

SELECT owner_type, supported, subscription_required
FROM subscriptions.subscription_owner_policies
ORDER BY owner_type;

SELECT feature_key, subscription_controlled
FROM subscriptions.product_features
ORDER BY feature_key
LIMIT 20;
```

Expected:

* `user.search` is granted to `ADMIN`, `SUPER_ADMIN`, `PLATFORM_ADMIN`, `ACADEMY_OWNER`, and `ACADEMY_ADMIN`.
* Owner policies exist for supported owner types.
* Subscription product features include stable feature keys.

## Rollback

If dev health checks fail, migrations fail, or dashboard login/users/subscriptions smoke checks fail:

1. Capture failed pipeline step, ECS task definition, image URIs, migration task logs, and CloudWatch logs.
2. Revert to the previous successful dev task definition.
3. If the issue is migration-related, stop deployment and inspect authorisation/subscriptions schema state before retrying.
4. Update this ticket with the failure reason and rollback evidence.

## Checklist

* [x] Release scope documented.
* [x] Deployment scripts updated for `infrastructure/terraform`.
* [x] API and Subscription Service images included in build metadata.
* [x] Service SQL migration runner includes authorisation and subscriptions migrations.
* [x] Backend Go tests passed.
* [x] Portal typecheck passed.
* [x] Portal build passed.
* [x] Terraform validate passed.
* [x] Release-specific deployment contract tests passed.
* [ ] Full historical `npm run test` suite green.
* [x] Release prep changes committed locally to `master` as `ae52a6f`.
* [ ] `master` pushed to remote.
* [ ] Bitbucket dev deployment completed.
* [ ] Dev smoke checks completed.
* [ ] Database verification completed.
