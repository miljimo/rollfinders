# Release Ticket: User, Payments, And Course Stabilization To Production

## Status

Reviewing. Source implementation is complete for the locally verified release candidate. Do not promote to production until the remaining release gates in this ticket are completed and production approval is recorded.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current local commit: `69f24a89a263499fbdae558134c84625026b1b8d`
* Short commit: `69f24a8 Fix course clone dialog payload`
* Requested date: 2026-06-18
* Release owner request: Product owner request in Codex session
* Local application URL: `http://localhost:3000`

## Purpose

Promote the current stabilization work for the RollFinders monolithic services app after completing the users/auth service integration, payments service integration, dashboard compatibility fixes, course/event UI fixes, and local migration validation.

This release includes:

* Go users/auth service integration for login, credentials, sessions, and managed user flows.
* RollFinders public-schema user-to-academy tracking for product-specific academy assignment.
* Users service-owned `users` schema with credentials and authentication tables.
* Go payments service integration for checkout/payment records and dashboard payment links.
* Payments service-owned `payments` schema with payment clients, payments, refunds, idempotency, provider events, and outbox tables.
* Internal-only Go service deployment topology for users/payments sidecars.
* Change-gated service image rebuild/redeploy support in the pipeline with force override support.
* Dashboard users table pagination fixed at 10 rows per page.
* Assigned academy visibility restored in admin user tables.
* Payment record event links made resilient to stale stored occurrence dates.
* Course clone dialog fixed so cloned create forms receive only editable fields and do not reuse persistence fields.
* Public event/course integration URI and QR code behavior retained.

## Implementation Completion Audit

Completed source blockers:

* Users service schema creation lives in `services/users/migrations/001_core_schema.sql`.
* Payments service schema creation lives in `services/payments/migrations/001_core_schema.sql`.
* Local Docker migration orchestration runs Prisma migrations and service SQL migrations.
* Users and payments service containers are healthy in local Docker.
* RollFinders keeps only product-specific user/academy assignment data in the public schema.
* Users/auth identity and credential data is in the `users` schema.
* Payment records are in the `payments` schema.
* Course clone payload no longer passes full Prisma event rows into client components.

Known non-release implementation notes:

* Historical PRD/audit files still contain older "not implemented" notes for unrelated future work such as custom map markers and analytics roadmap items. These are not blockers for this release scope.
* Browser E2E could not execute in this host because Playwright Chromium is missing native library `libnspr4.so`. The tests failed before any app assertion ran.

## Local Validation Completed

Completed on 2026-06-18:

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

Schema validation completed locally:

```sql
SELECT to_regclass('users.users');
SELECT to_regclass('users.credentials');
SELECT to_regclass('payments.payments');
SELECT to_regclass('payments.payment_clients');
SELECT to_regclass('public.users');
```

Observed:

* `users.users` exists.
* `users.credentials` exists.
* `payments.payments` exists.
* `payments.payment_clients` exists.
* `public.users` exists for RollFinders application-specific user profile and academy assignment data.
* Service schema migration versions exist:
  * `users`: `001_core_schema`
  * `payments`: `001_core_schema`

## Blocked Local Validation

`npm run test:e2e` was attempted on 2026-06-18 and failed before running browser assertions:

```text
chrome-headless-shell: error while loading shared libraries: libnspr4.so: cannot open shared object file: No such file or directory
```

Required action before final production approval:

* Run Playwright E2E in CI or on a host with Chromium dependencies installed.
* Minimum passing suite: `npm run test:e2e`.
* Record the result in this ticket.

## Production Promotion Requirements

### Remote Traceability

Before production deployment:

* Push `master` to `origin/master`.
* Confirm the deployed commit is `69f24a89a263499fbdae558134c84625026b1b8d` or a later approved commit containing this release.
* Record image URI and digest for:
  * web app image
  * users service image
  * payments service image

### Pre-Deployment Validation

Required immediately before production approval:

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run users:test
npm run payments:test
npm run build
npm run test:e2e
cd terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```

If payment provider sandbox credentials are available:

```bash
npm run payments:test:e2e
```

### Migration Gates

Before applying production migrations:

* Review Prisma migration plan.
* Review `services/users/migrations/001_core_schema.sql`.
* Review `services/payments/migrations/001_core_schema.sql`.
* Validate service SQL migrations idempotently against a production-like database.
* Confirm the service migrations create schemas and tables through the service migration path, not through RollFinders public schema migrations.

Required schema checks after migration:

```sql
SELECT to_regclass('users.users');
SELECT to_regclass('users.credentials');
SELECT to_regclass('users.sessions');
SELECT to_regclass('users.refresh_tokens');
SELECT to_regclass('payments.payments');
SELECT to_regclass('payments.payment_clients');
SELECT to_regclass('payments.refunds');
SELECT to_regclass('payments.outbox_events');
SELECT version FROM users.schema_migrations ORDER BY version;
SELECT version FROM payments.schema_migrations ORDER BY version;
```

### Deployment Security Gates

Go services must remain private:

* No public ALB listener for users or payments service ports.
* No public DNS records for users or payments services.
* No public security group ingress to users or payments services.
* RollFinders web app calls services through private task-local URLs.
* Public smoke checks against Go service endpoints from the internet must fail.

### Post-Deployment Smoke Checks

Required after production service stabilizes:

* `https://rollfinders.com/api/health` returns ok.
* `https://rollfinders.com/api/health?deep=1` returns ok and database ok.
* `/` loads.
* `/login` loads.
* Authenticated login succeeds.
* `/dashboard` loads for platform admin and academy admin users.
* Users table shows assigned academy where one exists.
* Users table paginates at 10 rows per page.
* Academy assignment create/edit flow persists in RollFinders public user data.
* Payment dashboard loads.
* Successful payment record links open the expected event/course detail page.
* Course/Event clone opens the create-course dialog with copied editable fields.
* Public course detail pages show integration URI QR code.
* Users service readiness passes from inside the private runtime.
* Payments service readiness passes from inside the private runtime.

## Rollback

If production deployment fails health checks, migrations fail, ECS cannot stabilize, or authenticated dashboard smoke checks fail:

* Stop promotion.
* Capture failed task definition, image URIs, image digests, migration logs, and app/service logs.
* Roll production back to the last known healthy task definition and images.
* Verify `https://rollfinders.com/api/health` and `https://rollfinders.com/api/health?deep=1`.
* Update this ticket with rollback reason, user impact, and follow-up owner.

## Validation Checklist

* [x] Implementation blockers addressed in source.
* [x] Local source tree clean before release-ticket creation.
* [x] `npm run lint` passed with warnings only.
* [x] `npm run typecheck` passed.
* [x] `npm run test` passed.
* [x] `npm run users:test` passed.
* [x] `npm run payments:test` passed.
* [x] `npm run build` passed.
* [x] Local Docker app rebuilt successfully.
* [x] Local web health checks passed.
* [x] Local users service health checks passed.
* [x] Local payments service health checks passed.
* [x] Local users/payments schema existence verified.
* [ ] Browser E2E passed in CI or a host with Playwright dependencies.
* [ ] `master` pushed to `origin/master`.
* [ ] Production image digests recorded.
* [ ] Production Terraform plan reviewed.
* [ ] Production migrations completed.
* [ ] Production service stabilized.
* [ ] Production smoke checks passed.
* [ ] Release tag created.

