# Release Ticket: Go Users/Auth And Payments Services To Production

## Status

Reviewing. Implementation blockers have been addressed in source. Do not deploy until the remaining release validation gates and production approval steps in this ticket are completed.

## Scope

Release the Go users/auth service, Go payments service, their service-owned PostgreSQL schemas, and private-only ECS deployment topology to production.

Included services:

* `services/users`: user-management, credential-authentication, IAM, sessions, MFA, password reset, and audit routines.
* `services/payments`: payment clients, checkouts, payments, refunds, provider events, idempotency, outbox, health, readiness, and metrics.
* `apps/backend_api/internal/services/users/migrations/001_core_schema.sql` and `apps/backend_api/internal/services/payments/migrations/001_core_schema.sql`.
* Private ECS/Fargate deployment with no public ALB listener or public IP for either Go service.

## Current Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current local commit: `69f24a89a263499fbdae558134c84625026b1b8d`
* Short commit: `69f24a8 Fix course clone dialog payload`
* Requested date: 2026-06-18
* Release owner request: Product owner request in Codex session
* Local application URL: `http://localhost:3000`

This release candidate includes the Go users/auth service integration, Go payments service integration, service-owned schemas, private-only service topology, RollFinders public-schema user-to-academy assignment compatibility, assigned academy table visibility, 10-row user pagination, resilient payment-to-event links, and the course clone dialog payload fix.

## Current Pipeline Findings

The production Bitbucket path for `main` currently runs:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run build
cd terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```

Then the manual production promotion step runs:

```bash
export ENVIRONMENT_NAME=production
export PRODUCTION_APPROVED=true
export PRODUCTION_MIGRATION_APPROVED=true
scripts/cicd/deploy-environment.sh
```

`scripts/cicd/deploy-environment.sh` currently:

* requires a successful `dev` promotion record unless `ALLOW_DIRECT_ENV_DEPLOY=true`;
* acquires the global deployment lock;
* runs Terraform with `-var="image_uri=${IMAGE_URI}"`;
* updates the existing ECS `web` service;
* runs `scripts/cicd/migrate.sh`, which executes `npx prisma migrate deploy` in the `web` container;
* runs `scripts/cicd/ensure-super-admin.sh`;
* runs `scripts/cicd/smoke.sh` against `/api/health` and `/api/health?deep=1`.

`scripts/cicd/build-go-services.sh` can build and push Go images:

```bash
export ENVIRONMENT_NAME=production
export FORCE_SERVICE_REDEPLOY=true
export SERVICE_REDEPLOY_TARGET=all
scripts/cicd/build-go-services.sh
```

It writes these image variables to `image.env`:

```bash
USER_SERVICE_IMAGE_URI=...
PAYMENT_SERVICE_IMAGE_URI=...
```

Production Terraform now consumes image variables for the `web`, `users`, and `payments` containers in one private ECS task. The public ALB still targets only `web` on port `3000`; `users` and `payments` are task-local sidecars reached by RollFinders through `127.0.0.1`.

## Production Blockers

Resolved in source:

* Terraform can add private `users` and `payments` sidecar containers when image URIs are supplied.
* Terraform consumes `USER_SERVICE_IMAGE_URI` and `PAYMENT_SERVICE_IMAGE_URI` through `user_service_image_uri` and `payment_service_image_uri`.
* The production pipeline builds Go service images on `main` before manual production deployment.
* The production migration task runs Prisma migrations and then Go service SQL migration orchestrators through `scripts/cicd/run-service-sql-migrations.sh`.
* The web runtime image includes `psql` and the service migration directories needed by the production migration task.
* App secrets include internal service URLs, service API keys, users JWT secret, and payment gateway/client defaults.
* The public security boundary remains ALB-to-web only. Go services are reached through task-local loopback URLs and do not get public listeners, DNS records, target groups, or security group ingress.
* Smoke checks include a private one-off ECS task path for `users` and `payments` `/healthz` and `/readyz`.

Remaining release gates:

* Production image digests must be recorded for `web`, `users`, and `payments`.
* Service SQL migrations must be validated idempotently against a production-like database.
* Production Terraform plan must be reviewed before apply.
* Browser E2E must pass in CI or on a host with Playwright Chromium dependencies installed.
* Production smoke and rollback evidence must be recorded after deployment.

## Local Validation Evidence

Completed on 2026-06-18 against release candidate `69f24a89a263499fbdae558134c84625026b1b8d`:

```bash
npm run lint
npm run typecheck
npm run test
npm run users:test
npm run payments:test
npm run build
docker compose --profile app up -d --build app
curl -fsS http://localhost:3000/api/health
curl -fsS 'http://localhost:3000/api/health?deep=1'
curl -fsS http://localhost:3002/healthz
curl -fsS http://localhost:3002/readyz
curl -fsS http://localhost:3003/healthz
curl -fsS http://localhost:3003/readyz
```

Results:

* `npm run lint` passed with existing warnings only.
* `npm run typecheck` passed.
* `npm run test` passed: 177/177 unit and contract tests.
* `npm run users:test` passed.
* `npm run payments:test` passed.
* `npm run build` passed with Next.js 16.2.7.
* Local Docker app rebuilt and started successfully.
* `rollfinder-app-1` is healthy.
* `rollfinder-users-1` is healthy.
* `rollfinder-payments-1` is healthy.
* Web shallow health returned `{"status":"ok"}`.
* Web deep health returned `{"status":"ok","database":"ok"}`.
* Users service returned `healthz` ok and `readyz` ready.
* Payments service returned `healthz` ok and `readyz` ready.

Local schema validation:

```sql
SELECT to_regclass('users.users');
SELECT to_regclass('users.credentials');
SELECT to_regclass('payments.payments');
SELECT to_regclass('payments.payment_clients');
SELECT to_regclass('public.users');
SELECT version FROM users.schema_migrations ORDER BY version;
SELECT version FROM payments.schema_migrations ORDER BY version;
```

Observed:

* `users.users` exists.
* `users.credentials` exists.
* `payments.payments` exists.
* `payments.payment_clients` exists.
* `public.users` exists for RollFinders application-specific user profile and academy assignment data.
* `users.schema_migrations` contains `001_core_schema`.
* `payments.schema_migrations` contains `001_core_schema`.

`npm run test:e2e` was attempted on 2026-06-18 and failed before running browser assertions:

```text
chrome-headless-shell: error while loading shared libraries: libnspr4.so: cannot open shared object file: No such file or directory
```

This is an environment blocker, not an application assertion failure. Production approval still requires `npm run test:e2e` to pass in CI or on a host with Playwright Chromium dependencies installed.

## Required Production Pipeline Steps

After the blockers are resolved, production release SHALL use this order.

### 0. Production Availability Guard

Production deployments SHALL NOT intentionally put `rollfinders.com` offline.

Required behavior:

* The current healthy production task definition must keep serving traffic until the replacement task definition is healthy and has passed smoke checks.
* ECS deployment settings must keep enough healthy tasks online during rollout; production must not use a deployment configuration that drops desired healthy capacity to zero.
* Database migrations must be backward compatible with the currently running application until the new application is serving successfully.
* Operators must not change DNS, ALB listeners, target groups, or public certificates in a way that removes the active production route before the replacement route is validated.
* The production release must include a pre-deployment `https://rollfinders.com/api/health` check and a post-deployment `https://rollfinders.com/api/health` check.
* If public DNS is unhealthy before deployment, the release must be blocked unless the work is explicitly a DNS recovery and an ALB-bypassed smoke check is recorded.

If a planned operation cannot guarantee uninterrupted service, the release must use a controlled deployment admin or maintenance page instead of a browser/network failure.

Maintenance/admin page requirements:

* It must be served by stable infrastructure outside the changing application task, such as an ALB fixed response, S3/CloudFront static page, or a known-good previous ECS task.
* It must say the service is temporarily unavailable for planned maintenance and give an expected return window.
* It must avoid exposing internal error details, stack traces, database errors, migration output, secrets, or AWS resource names.
* It must be enabled only after approval and disabled immediately after the production service is healthy.
* The release ticket must record the start time, expected end time, reason, operator, and final removal confirmation.

### 1. Preflight Validation

Run before approving production:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run build
npm run users:test
npm run payments:test
npm run test:e2e
cd terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```

If provider credentials are available for sandbox validation, also run:

```bash
npm run payments:test:e2e
```

### 2. Build Artifacts

The production release needs immutable images for all three services:

```bash
export ENVIRONMENT_NAME=production
scripts/cicd/prepare-ecr.sh
scripts/cicd/build.sh
export FORCE_SERVICE_REDEPLOY=true
export SERVICE_REDEPLOY_TARGET=all
scripts/cicd/build-go-services.sh
```

Gate: `image.env` must contain all of:

```bash
IMAGE_URI=...
USER_SERVICE_IMAGE_URI=...
PAYMENT_SERVICE_IMAGE_URI=...
```

Gate: record image digests for `IMAGE_URI`, `USER_SERVICE_IMAGE_URI`, and `PAYMENT_SERVICE_IMAGE_URI`.

### 3. Migration Validation Before Production

Go service migrations must be validated against a production-like database before production execution:

```bash
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/backend_api/internal/services/users/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/backend_api/internal/services/payments/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/backend_api/internal/services/users/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/backend_api/internal/services/payments/migrations/001_core_schema.sql
```

Gate: both second runs must be no-ops or complete successfully.

Gate: verify schema versions:

```sql
SET search_path TO users, public;
SELECT version FROM schema_migrations ORDER BY version;

SET search_path TO payments, public;
SELECT version FROM schema_migrations ORDER BY version;
```

Gate: verify readiness functions and required tables:

```sql
SELECT * FROM users.database_ready();
SELECT to_regclass('users.users');
SELECT to_regclass('users.credentials');
SELECT to_regclass('users.sessions');
SELECT to_regclass('users.refresh_tokens');
SELECT to_regclass('payments.payments');
SELECT to_regclass('payments.payment_clients');
SELECT to_regclass('payments.refunds');
SELECT to_regclass('payments.outbox_events');
```

### 4. Production Deployment

Production promotion remains guarded:

```bash
export ENVIRONMENT_NAME=production
export PRODUCTION_APPROVED=true
export PRODUCTION_MIGRATION_APPROVED=true
scripts/cicd/deploy-environment.sh
```

Required implementation before this is valid:

* Terraform must pass `USER_SERVICE_IMAGE_URI` and `PAYMENT_SERVICE_IMAGE_URI` into private ECS task sidecars.
* The deployment script must update the monolithic task definition with all intended container images atomically enough to prevent app/service version skew.
* Go service migrations must run before the new task definition is used by production traffic.
* The deployment must preserve the existing production route until the replacement service is healthy; do not detach the old task set, lower desired capacity to zero, remove DNS, or disable the ALB listener as part of a normal deploy.
* Go services must be deployed in private subnets with `assignPublicIp=DISABLED`.
* Go services must not be attached to the public ALB.
* Internal callers must use task-local loopback URLs or another private-only routing mechanism.

### 5. Post-Deployment Smoke Checks

Existing web smoke checks must still pass:

```bash
curl -fsS https://rollfinders.com/api/health
curl -fsS https://rollfinders.com/api/health?deep=1
```

Go service smoke checks must run from inside the VPC, for example via ECS exec or a one-off private Fargate task:

```bash
curl -fsS http://127.0.0.1:8081/healthz
curl -fsS http://127.0.0.1:8081/readyz
curl -fsS http://127.0.0.1:8082/healthz
curl -fsS http://127.0.0.1:8082/readyz
```

Gate: public internet checks for the Go services must fail. There must be no public DNS name, no public ALB route, and no public IP assigned to users or payments tasks.

## Rollback Notes

Application rollback:

* Capture current and previous monolithic ECS task definitions before deployment.
* If rollout fails before migrations are used by production traffic, update the ECS service back to the previous task definition and wait for stability.
* If only one container image is faulty, create a reviewed replacement task definition that reuses the known-good image for that container while preserving migration compatibility.

Migration rollback:

* The Go schema migrations are forward DDL/routine deployment files with no down migrations.
* Rollback is restore-from-backup or forward-fix unless a reviewed manual rollback script exists.
* Before production migration, record the latest RDS snapshot or point-in-time recovery marker.
* Do not roll back application code across incompatible schema or routine signatures without confirming function/procedure compatibility.

Pipeline rollback commands will depend on final Terraform outputs, but the expected ECS shape is:

```bash
aws ecs update-service --region eu-west-2 --cluster <cluster> --service <service> --task-definition <previous-task-definition>
aws ecs wait services-stable --region eu-west-2 --cluster <cluster> --services <service>
```

## Risks

* High: production pipeline and migration paths now include Go services, but first production rollout still needs careful image, plan, migration, and smoke evidence.
* High: users/auth migration can affect login, password reset, admin user management, roles, protected super admin behavior, and sessions.
* High: payments migration can affect checkout, capture, cancel, refund, webhook idempotency, outbox dispatch, and provider reconciliation.
* Medium: shared database schemas require strict ownership boundaries; Prisma and Go routines must not compete for the same tables.
* Medium: no public Go service deployment requires private health-check coverage and rollback evidence during first production rollout.
* Medium: payment provider credentials and callback URLs must be production-correct before rollout.

## Release Checklist

* [ ] Production availability guard reviewed before deployment.
* [ ] Pre-deployment `https://rollfinders.com/api/health` passes, or a DNS recovery exception with ALB-bypassed smoke evidence is recorded.
* [ ] ECS deployment configuration preserves healthy production capacity during rollout.
* [ ] Migration compatibility with the currently running production app is confirmed.
* [ ] Maintenance/admin page fallback is ready and approved if uninterrupted service cannot be guaranteed.
* [x] Terraform defines private ECS task sidecars for users and payments.
* [x] Terraform consumes `USER_SERVICE_IMAGE_URI` and `PAYMENT_SERVICE_IMAGE_URI`.
* [x] Production pipeline builds or promotes immutable users and payments images.
* [x] Go service runtime secrets are defined and injected.
* [x] Users and payments tasks run in private subnets with `assignPublicIp=DISABLED` through the shared ECS service network configuration.
* [x] Users and payments services have no public ALB listener or public DNS route.
* [x] Task-local private routing is configured.
* [x] Go SQL migrations have a production runner.
* [x] Local users migration schema and version validate.
* [x] Local payments migration schema and version validate.
* [ ] Users migration validates cleanly and idempotently against a production-like database.
* [ ] Payments migration validates cleanly and idempotently against a production-like database.
* [x] `npm run lint` passes with warnings only.
* [x] `npm run typecheck` passes.
* [x] `npm run test` passes.
* [x] `npm run users:test` passes.
* [x] `npm run payments:test` passes.
* [x] `npm run build` passes.
* [x] Local Docker app/users/payments health checks pass.
* [ ] Browser E2E passes in CI or a host with Playwright dependencies.
* [ ] Production backup/PITR marker is recorded before migrations.
* [x] `go test ./... && go vet ./...` passes in `services/users`.
* [x] `go test ./... && go vet ./...` passes in `services/payments`.
* [ ] Web production health passes before deployment.
* [ ] Production deployment lock is acquired by `scripts/cicd/deploy-environment.sh`.
* [ ] Prisma migrations complete successfully.
* [ ] Users schema migration completes successfully.
* [ ] Payments schema migration completes successfully.
* [ ] Web ECS service stabilizes.
* [ ] Users ECS service stabilizes.
* [ ] Payments ECS service stabilizes.
* [ ] Web `/api/health` and `/api/health?deep=1` pass.
* [ ] `rollfinders.com` remains reachable throughout deployment, or the approved maintenance/admin page is visible during the interruption window.
* [ ] Users `/healthz` and `/readyz` pass from inside the VPC.
* [ ] Payments `/healthz`, `/readyz`, and `/metrics` pass from inside the VPC.
* [ ] Public access to users and payments services is confirmed absent.
* [ ] Rollback task definitions and image digests are recorded.

## Acceptance Criteria

* Production web, users, and payments services run images traceable to the approved commit.
* Users and payments database schemas are present, versioned, and readiness checks pass.
* No users or payments API is publicly reachable except through explicitly approved web/API mediation.
* Existing web production health and deep database health pass.
* Rollback evidence is recorded before traffic is considered released.
