# Release Ticket: Go Users/Auth And Payments Services To Production

## Status

Reviewing. Do not deploy until the blockers in this ticket are resolved.

## Scope

Release the Go users/auth service, Go payments service, their service-owned PostgreSQL schemas, and private-only ECS deployment topology to production.

Included services:

* `services/users`: user-management, credential-authentication, IAM, sessions, MFA, password reset, and audit routines.
* `services/payments`: payment clients, checkouts, payments, refunds, provider events, idempotency, outbox, health, readiness, and metrics.
* `services/users/migrations/001_core_schema.sql` and `services/payments/migrations/001_core_schema.sql`.
* Private ECS/Fargate deployment with no public ALB listener or public IP for either Go service.

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

However, production Terraform currently only consumes `image_uri` for the `web` service. No production Terraform resources were found for users or payments ECS services, target groups, service discovery records, or Go service secrets.

## Production Blockers

* Terraform does not yet define production ECS services for `users` or `payments`.
* Terraform does not consume `USER_SERVICE_IMAGE_URI` or `PAYMENT_SERVICE_IMAGE_URI`.
* The production pipeline does not run `scripts/cicd/build-go-services.sh` on `main`; only dev and feature/develop build paths currently call it.
* The production migration task only runs Prisma migrations. It does not run `services/users/migrations/001_core_schema.sql` or `services/payments/migrations/001_core_schema.sql`.
* There is no production migration runner for Go service SQL orchestrators. The orchestrators use `\ir`, so they must be executed by `psql` from their service migration directories or replaced with a purpose-built runner.
* The shared app secret does not currently include required Go service runtime values such as `API_KEY`, `JWT_SECRET`, payment provider secrets, `PAYMENT_PUBLIC_BASE_URL`, and payment callback defaults.
* The current ECS security group only allows ALB traffic to port `3000`; private service-to-service access to Go services on `8080` is not defined.
* Production smoke checks do not validate `/healthz` or `/readyz` for either Go service.

## Required Production Pipeline Steps

After the blockers are resolved, production release SHALL use this order.

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
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f services/users/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f services/payments/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f services/users/migrations/001_core_schema.sql
psql "$VALIDATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f services/payments/migrations/001_core_schema.sql
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
SELECT to_regclass('payments.payments');
SELECT to_regclass('payments.payment_clients');
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

* Terraform must pass `USER_SERVICE_IMAGE_URI` and `PAYMENT_SERVICE_IMAGE_URI` into private ECS services.
* The deployment script must update all intended ECS services atomically enough to prevent app/service version skew.
* Go service migrations must run before Go task rollout or before any web release that calls the Go APIs.
* Go services must be deployed in private subnets with `assignPublicIp=DISABLED`.
* Go services must not be attached to the public ALB.
* Internal callers must use private service discovery or another private-only routing mechanism.

### 5. Post-Deployment Smoke Checks

Existing web smoke checks must still pass:

```bash
curl -fsS https://rollfinders.com/api/health
curl -fsS https://rollfinders.com/api/health?deep=1
```

Go service smoke checks must run from inside the VPC, for example via ECS exec or a one-off private Fargate task:

```bash
curl -fsS http://users:8080/healthz
curl -fsS http://users:8080/readyz
curl -fsS http://payments:8080/healthz
curl -fsS http://payments:8080/readyz
curl -fsS http://payments:8080/metrics
```

Gate: public internet checks for the Go services must fail. There must be no public DNS name, no public ALB route, and no public IP assigned to users or payments tasks.

## Rollback Notes

Application rollback:

* Capture current and previous task definitions for `web`, `users`, and `payments` before deployment.
* If service rollout fails before migrations are used by production traffic, update failed ECS services back to the previous task definitions and wait for stability.
* If only the web service fails, roll back `web` independently only if the previous web image remains compatible with already-run Go service migrations.
* If users or payments fail readiness after rollout, roll those services back first, then roll back web if web has started depending on the new service contract.

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

* High: current production pipeline does not deploy Go services despite building Go images in non-production paths.
* High: current production migrations do not apply service-owned `users` or `payments` schemas.
* High: users/auth migration can affect login, password reset, admin user management, roles, protected super admin behavior, and sessions.
* High: payments migration can affect checkout, capture, cancel, refund, webhook idempotency, outbox dispatch, and provider reconciliation.
* Medium: shared database schemas require strict ownership boundaries; Prisma and Go routines must not compete for the same tables.
* Medium: no public Go service deployment requires private DNS, security group, and health-check coverage that does not currently exist.
* Medium: payment provider credentials and callback URLs must be production-correct before rollout.

## Release Checklist

* [ ] Terraform defines private ECS services for users and payments.
* [ ] Terraform consumes `USER_SERVICE_IMAGE_URI` and `PAYMENT_SERVICE_IMAGE_URI`.
* [ ] Production pipeline builds or promotes immutable users and payments images.
* [ ] Go service runtime secrets are defined and injected.
* [ ] Users and payments tasks run in private subnets with `assignPublicIp=DISABLED`.
* [ ] Users and payments services have no public ALB listener or public DNS route.
* [ ] Private service discovery or equivalent private routing is configured.
* [ ] Go SQL migrations have a production runner.
* [ ] Users migration validates cleanly and idempotently.
* [ ] Payments migration validates cleanly and idempotently.
* [ ] Production backup/PITR marker is recorded before migrations.
* [ ] `npm run users:test` passes.
* [ ] `npm run payments:test` passes.
* [ ] Web production health passes before deployment.
* [ ] Production deployment lock is acquired by `scripts/cicd/deploy-environment.sh`.
* [ ] Prisma migrations complete successfully.
* [ ] Users schema migration completes successfully.
* [ ] Payments schema migration completes successfully.
* [ ] Web ECS service stabilizes.
* [ ] Users ECS service stabilizes.
* [ ] Payments ECS service stabilizes.
* [ ] Web `/api/health` and `/api/health?deep=1` pass.
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
