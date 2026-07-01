# Name: RELEASE-20260630 - Promote Portal, Wallet, And Component Refactors To Production

## Feature / Component

- Feature: Production Release
- Component: Portal, backend API services, wallet service, payments UI, dashboard components, deployment runtime
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, production image build, migration validation, smoke-test access
- Source PRD: `docs/features/Deployment/Delivery/Reviewing/PortalAndWalletProductionReleaseTicket-20260630.md`

## Goal

Deploy the current `master` release candidate to the production environment without downtime, with rollback and verification evidence recorded.

## Status

Blocked for production deployment. This ticket prepares the production release plan and records local validation evidence. Do not deploy to production until explicit human approval is given with the target environment, source commit, migration plan, config changes, and rollback plan, and the release blockers in this ticket are resolved or explicitly waived.

## Specification

### Deployment Target

- App: `rollfinder`
- Service: Portal app plus backend API service set
- Environment: `production`
- Type: frontend, backend, migration, worker/service runtime
- Runtime: Next.js, Go, Docker, ECS

### Source

- Branch: `master`
- Commit/Tag: `9553624907808ffa4a7b42886d56b666e1dd6d97`
- Short commit: `9553624 Stabilize portal release validation`
- Ticket: `RELEASE-20260630`
- PR: Not assigned in this ticket

### Release Contents

This production candidate deploys the application code from `9553624`. Later commits on `master` are release-ticket metadata updates only and do not change the application artifact:

- `811d3e9` Record pushed production release candidate.
- `83c9ccd` Fix production release approval commit.
- `3972fb7` Update production release ticket evidence.
- `9553624` Stabilize portal release validation.
- `224f7de` Prepare production release ticket.
- `23e60ec` Split side panel control components.
- `9e52a7a` Move payment components under payments namespace.
- `c6ecc4c` Add reusable data table search component.
- `23a020f` Document UI component tickets.
- `5224be9` Component Skills changed.
- `9774a16` Restore wallet transaction dashboard.
- `4ec2c94` Add minimal wallet transfer service.
- `aec38e0` Add wallet dashboard and secure maps config.

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `ENVIRONMENT_NAME=production` | Yes | deployment environment | Selects production deployment configuration. |
| `PRODUCTION_APPROVED=true` | Yes | explicit human approval | Required guard for production deployment. |
| `PRODUCTION_MIGRATION_APPROVED=true` | Yes, if migrations run | explicit human approval | Confirms production database migration approval. |
| `IMAGE_URI` | Yes | build artifact `image.env` | Immutable portal/web Docker image URI. |
| `API_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | API gateway service image URI. |
| `USER_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Users service image URI. |
| `AUTHORISATION_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Authorisation service image URI. |
| `ACADEMY_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Academy service image URI. |
| `ORGANISATION_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Organisation service image URI. |
| `COURSE_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Courses service image URI. |
| `BOOKING_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Booking service image URI. |
| `PAYMENT_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Payments service image URI. |
| `SUBSCRIPTION_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Subscriptions service image URI. |
| `NOTIFICATION_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Notification service image URI. |
| `ANALYTICS_SERVICE_IMAGE_URI` | Yes | build artifact `image.env` | Analytics service image URI. |
| Production secrets | Yes | AWS/secret manager | Existing production app and service secrets. Do not print or commit secret values. |

### Infrastructure

- Production deployment must reuse existing ECS, networking, DNS, certificate, database, and logging resources.
- Do not add NAT Gateway, ALB, provisioned database, public service listener, or other always-on infrastructure from this release without separate approval.
- Backend services must remain behind the API gateway/private runtime boundary.
- Public traffic must continue to route through the existing production frontend/API entrypoint.

### Database

- Migration path: `apps/backend_api/migrations/`
- Migration required: Yes, if unapplied service migrations exist in production.
- Seed data required: Yes, if authorisation/resources/subscription/wallet seed routines detect missing catalog rows.
- Backward compatible: Required.

Migration validation must include:

- Prisma migration status for the portal schema.
- Service SQL migrations under `apps/backend_api/migrations/<service_name>/`.
- Idempotent seed/catalog routines for authorisation resources and any service-owned seed data.
- Confirmation that no service migration modifies another service's owned tables.

### Deployment Steps

1. Confirm production approval is explicit and names this application source commit: `9553624907808ffa4a7b42886d56b666e1dd6d97`.
2. Confirm the worktree is clean and `master` points at the approved commit.
3. Run preflight validation:

   ```bash
   npm ci
   npm run db:generate
   npm run typecheck
   npm run build
   cd apps/backend_api && go test ./...
   ```

4. Run release-specific contract/unit validation:

   ```bash
   node --import tsx --test "apps/portal/src/components/{GridDashboard,SidePanelControl,Table}/__tests__/*.test.tsx"
   node --import tsx --test apps/portal/src/lib/__tests__/wallet-dashboard-contracts.test.ts
   ```

5. Run full test suite if release approval requires all historical contracts to pass:

   ```bash
   npm run test
   ```

6. Build immutable production images:

   ```bash
   export ENVIRONMENT_NAME=production
   scripts/cicd/prepare-ecr.sh
   scripts/cicd/build.sh
   export FORCE_SERVICE_REDEPLOY=true
   export SERVICE_REDEPLOY_TARGET=all
   scripts/cicd/build-go-services.sh
   ```

7. Record all image URIs and image digests from `image.env`.
8. Validate production Terraform plan before apply.
9. Run production deployment through the approved deployment path:

   ```bash
   export ENVIRONMENT_NAME=production
   export PRODUCTION_APPROVED=true
   export PRODUCTION_MIGRATION_APPROVED=true
   scripts/cicd/deploy-environment.sh
   ```

10. Record ECS task definition ARN, deployed image digests, migration output, and smoke-test output in this ticket or release notes.

### Verification Steps

- WHEN `https://rollfinders.com/api/health` is requested before deployment, THEN it returns HTTP 200 or the release is blocked.
- WHEN production migration runs, THEN Prisma and service SQL migrations complete without errors.
- WHEN the new ECS task starts, THEN all required containers become healthy.
- WHEN `https://rollfinders.com/api/health` is requested after deployment, THEN it returns HTTP 200.
- WHEN `https://rollfinders.com/api/health?deep=1` is requested after deployment, THEN it returns HTTP 200 and database status is ok.
- WHEN a production user logs in, THEN authentication succeeds and redirects to `/dashboard`.
- WHEN `/dashboard` loads for an authorised admin, THEN the dashboard service grid renders without server error.
- WHEN `/dashboard/wallet` loads for an authorised platform admin, THEN wallet balances, wallets table, and transactions panel render.
- WHEN `/dashboard/payment` loads for an authorised admin, THEN payment dashboard routes and namespaced payment components render.
- WHEN `/dashboard/users` loads for an authorised admin, THEN the split side panel navigation still renders and nested navigation remains accessible.
- WHEN production logs are reviewed for the first 15 minutes, THEN no repeated startup, migration, auth, or API gateway errors are present.

### Rollback Plan

- Method: redeploy previous ECS task definition and previous image set.
- Data rollback required: No by default; yes only if a migration is identified as non-backward-compatible during validation.
- Manual action required: Yes.

Steps:

1. Capture failed health check, ECS task definition ARN, image URIs, migration logs, and CloudWatch errors.
2. Stop promotion and prevent further production deploy attempts.
3. Repoint ECS service to the previous known-good task definition.
4. Wait for ECS service stability.
5. Re-run:

   ```bash
   curl -fsS https://rollfinders.com/api/health
   curl -fsS 'https://rollfinders.com/api/health?deep=1'
   ```

6. If failure is migration-related, do not run destructive SQL rollback automatically. Inspect service-owned schema state and prepare a separate database recovery ticket.
7. Record rollback evidence and final production status.

### Risks

- Full historical `npm run test` may include existing unrelated contract failures; production approval must decide whether those block this release.
- Wallet and transfer service changes may require production migration/seed validation before traffic.
- Dashboard component refactors can affect navigation access if route-specific smoke checks are skipped.
- Payment component namespace changes can affect dashboard imports if stale bundles or deployment artifacts are reused.

### Out Of Scope

- Creating or changing production infrastructure resources.
- Destroying, stopping, or resizing production services.
- Adding new public DNS, ALB listeners, NAT Gateways, or databases.
- Manual data repair outside service-owned migrations.
- Deploying to production without explicit approval.

## Local Validation Evidence

Completed locally in this Codex session on 2026-07-01 against application commit `9553624907808ffa4a7b42886d56b666e1dd6d97`; latest `master` also includes release-ticket-only metadata commits:

```bash
node --import tsx --test "apps/portal/src/components/{GridDashboard,SidePanelControl,Table}/__tests__/*.test.tsx" apps/portal/src/lib/__tests__/wallet-dashboard-contracts.test.ts
npm run test
cd apps/backend_api && go test ./...
npm run build
bash -n scripts/cicd/deploy-environment.sh scripts/cicd/deploy.sh scripts/cicd/migrate.sh scripts/cicd/seed.sh scripts/cicd/smoke.sh scripts/cicd/build.sh scripts/cicd/build-go-services.sh scripts/cicd/prepare-ecr.sh scripts/cicd/run-service-sql-migrations.sh
git push origin master
```

Results:

- Release-specific component, table, side panel, and wallet dashboard tests passed: 17/17.
- Full portal suite passed through `npm run test`: 266 passed, 1 skipped, 0 failed.
- Backend Go tests passed across `apps/backend_api`.
- Next.js production build passed.
- Deployment shell syntax checks passed for the release deployment scripts.
- `master` was pushed to `origin/master` with the application commit and release-ticket metadata commits.

Production public health check from this workstation:

```bash
curl -fsS https://rollfinders.com/api/health
curl -fsS 'https://rollfinders.com/api/health?deep=1'
```

Result: blocked locally by DNS resolution failure:

```text
curl: (6) Could not resolve host: rollfinders.com
```

Additional validation required before production deployment:

- Verify production DNS and public health from a network that resolves `rollfinders.com`.
- Run Terraform plan review for production.
- Build production images and record immutable image digests.
- Validate production migration state and service-owned migrations.
- Complete production smoke checks after deployment.

## Production Blockers

- Explicit production approval is missing. Approval must name environment `production`, application source commit `9553624907808ffa4a7b42886d56b666e1dd6d97`, migration plan, config changes, and rollback plan.
- Production DNS and health checks could not be verified from this workstation because `rollfinders.com` did not resolve locally.
- Production image artifacts and digests have not been built or recorded.
- Production Terraform plan has not been reviewed.
- Production migration status has not been verified.

## Acceptance Criteria

- WHEN this ticket is reviewed, THEN the release candidate source commit and deployment target are clear.
- WHEN production approval is requested, THEN it names application commit `9553624907808ffa4a7b42886d56b666e1dd6d97`, migration plan, config changes, and rollback plan.
- WHEN production deployment runs, THEN it uses immutable image URIs and records image digests.
- WHEN deployment completes, THEN production health, dashboard, wallet, payment, and users smoke checks pass.
- WHEN any production gate fails, THEN rollback steps are followed and evidence is recorded.

## Regression / Compatibility Tests

- Confirm public site pages still load without authentication.
- Confirm `/dashboard` requires authentication.
- Confirm dashboard grid search and service cards render.
- Confirm side panel desktop and mobile navigation still works.
- Confirm wallet dashboard retains balances, wallets, and transactions.
- Confirm payment dashboard components load from the payments namespace.
- Confirm backend service health checks pass through the deployed task.
- Confirm no service modifies another service's owned tables.
