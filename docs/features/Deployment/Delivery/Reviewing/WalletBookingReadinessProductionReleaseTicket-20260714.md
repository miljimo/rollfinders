# Name: RELEASE-20260714 - Wallet Stripe Linking And Booking Readiness Production Release

## Feature / Component

- Feature: Production Release
- Component: Portal booking checkout readiness, Wallet Service linked accounts, Authorisation permissions, Payments integration, RDS cost configuration
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, clean release commit, production image build, service migration approval, Terraform plan review, smoke-test access
- Source PRD: `docs/features/Deployment/Delivery/Reviewing/WalletBookingReadinessProductionReleaseTicket-20260714.md`
- Ticket status: Reviewing, created on 2026-07-14

## Goal

Release the current wallet, booking readiness, payment integration, authorisation permission, and RDS cost-configuration work to production without reintroducing RDS cost drift or breaking public event booking and checkout.

## Status

Blocked for production deployment until the release source is made clean and explicit.

Current `master` state at ticket creation:

- `master` is ahead of `origin/master` by one commit.
- Current committed release candidate: `3fb2c22 Fix wallet Stripe linking and booking readiness`.
- Additional uncommitted files exist and must be committed into a new release candidate or explicitly excluded before production approval.

Uncommitted files at ticket creation:

```text
apps/backend_api/containers/payments/compose.yml
apps/portal/src/app/courses/[id]/page.tsx
apps/portal/src/app/courses/[id]/payment-actions.ts
apps/portal/src/app/open-mats/[id]/page.tsx
apps/portal/src/lib/__tests__/course-payment-integration-contracts.test.ts
apps/portal/src/lib/academy-payment-account.ts
apps/portal/src/lib/bookings.ts
compose.yml
```

## Scope

The release agent must:

- Confirm the final source commit before deployment.
- Include committed wallet Stripe linking and booking readiness changes from `3fb2c22` if approved.
- Decide whether the uncommitted booking/payment readiness edits are included in this release; if included, commit them before production approval.
- Run service migrations for authorisation and wallet if the committed migration files have not been applied in production.
- Preserve the RDS cost-optimized Terraform settings from `bcec54c Persist RDS cost reduction settings`.
- Verify public event detail pages still calculate booking and checkout readiness correctly.
- Verify wallet linked-account flows can find Stripe connected accounts.
- Verify production health, public discovery, event booking, payment checkout, wallet dashboard, and admin dashboard smoke checks.

The release agent must not:

- Deploy from a dirty worktree.
- Deploy uncommitted local files.
- Run broad Terraform apply while unrelated security group drift remains unresolved.
- Re-enable RDS Multi-AZ or increase automated backup retention unless explicitly approved.
- Delete the retained RDS recovery snapshot.
- Seed subscription catalogue products or plans.
- Deploy unrelated services or task-shape changes without explicit approval.

## Implementation Notes

- Source branch: `master`
- Current committed release candidate at ticket creation: `3fb2c22 Fix wallet Stripe linking and booking readiness`
- Required RDS Terraform commit already on `master`: `bcec54c Persist RDS cost reduction settings`
- Prior wallet uniqueness commit on `master`: `fc1e6d2 Enforce wallet uniqueness and academy capability checks`
- RDS retained recovery snapshot: `rollfinder-production-postgres-cost-reduction-20260713141416`
- Production RDS cost settings that must remain unchanged:
  - `db_multi_az = false`
  - `db_backup_retention_period = 3`
  - `deletion_protection = true`
- Database impact:
  - Authorisation migration may be required: `apps/backend_api/internal/services/authorisation/migrations/020_seed_academy_wallet_permissions.sql`
  - Wallet migration may be required: `apps/backend_api/internal/services/wallet/migrations/tables/013_fixLinkedAccountProviderConflict.sql`
  - Wallet uniqueness migration from prior commit may be required: `apps/backend_api/internal/services/wallet/migrations/tables/012_walletOwnerTypeCurrencyUniqueness.sql`
- Config impact:
  - Existing runtime must provide booking, payment, and wallet service base URLs expected by the deployed portal code.
  - If the uncommitted direct-service readiness edits are included, verify `BOOKING_PUBLIC_BASE_URL` and `WALLET_INTERNAL_BASE_URL` are available in the production web container.
- Infrastructure impact:
  - No new infrastructure is approved in this release.
  - Terraform is source of truth for RDS cost settings only.
  - Security group drift is out of scope and must not be applied from this release.

## Specification

### Deployment Target

- App: `rollfinder`
- Service: Portal app, API gateway, authorisation service, wallet service, booking service, payments service
- Environment: `production`
- Type: frontend, backend, migration, infrastructure-state verification
- Runtime: Next.js, Go, Docker, ECS/Fargate, Terraform, PostgreSQL

### Source

- Branch: `master`
- Commit/Tag: `3fb2c22 Fix wallet Stripe linking and booking readiness`
- Ticket: `RELEASE-20260714`
- PR: Not assigned in this ticket

If the uncommitted booking/payment readiness edits are included, update this section with the new commit hash before approval.

### Required Config

| Name | Required | Source | Description |
|---|---:|---|---|
| `ENVIRONMENT_NAME=production` | Yes | deployment environment | Selects production deployment configuration. |
| `PRODUCTION_APPROVED=true` | Yes | explicit human approval | Required guard for production deployment. |
| `PRODUCTION_MIGRATION_APPROVED=true` | Yes | explicit human approval | Required if authorisation or wallet migrations are run. |
| `IMAGE_URI` | Yes | build artifact | Immutable portal/web Docker image URI. |
| `API_SERVICE_IMAGE_URI` | Yes | build artifact | API gateway image URI. |
| `AUTHORISATION_SERVICE_IMAGE_URI` | Yes | build artifact | Authorisation service image URI. |
| `WALLET_SERVICE_IMAGE_URI` | Yes, if wallet service is deployed | build artifact | Wallet service image URI. |
| `BOOKING_SERVICE_IMAGE_URI` | Yes | build artifact | Booking service image URI. |
| `PAYMENT_SERVICE_IMAGE_URI` | Yes | build artifact | Payments service image URI. |
| `BOOKING_PUBLIC_BASE_URL` | Conditional | app runtime env | Required if release uses direct booking service calls from portal server code. |
| `WALLET_INTERNAL_BASE_URL` | Conditional | app runtime env | Required if release uses wallet linked account readiness from portal server code. |

### Infrastructure

- Existing ECS/Fargate, ALB, DNS, RDS, and networking must be reused.
- Do not run broad Terraform apply until unrelated security group drift is reviewed.
- Run Terraform validation and targeted RDS checks only to confirm RDS cost settings remain source-controlled.
- RDS production values must remain:

  ```text
  db_backup_retention_period = 3
  db_multi_az = false
  ```

### Database

- Migration path: service-local migrations under `apps/backend_api/internal/services/<service>/migrations/`
- Migration required: Yes, if production has not applied the committed authorisation/wallet migrations.
- Seed data required: Authorisation permission seed/reconciliation only.
- Backward compatible: Required.

Required migration review:

- Authorisation migration must only seed/reconcile authorisation-owned permissions.
- Wallet migrations must only affect wallet-owned schema/functions.
- No subscription catalogue seed data may be introduced.
- No migration may modify another service-owned schema.

### Deployment Steps

1. Confirm final source commit and update this ticket if it differs from `3fb2c22`.
2. Ensure the worktree is clean:

   ```bash
   git status -sb
   ```

3. Confirm `master` is pushed:

   ```bash
   git log --oneline -5
   git ls-remote origin refs/heads/master
   ```

4. Validate Terraform source and RDS state:

   ```bash
   terraform -chdir=infrastructure/terraform validate
   terraform -chdir=infrastructure/terraform state show module.database.aws_db_instance.app
   ```

5. Run pre-release checks:

   ```bash
   npm run typecheck
   npm run build
   cd apps/backend_api && go test ./internal/services/authorisation/... ./internal/services/wallet/... ./internal/services/booking/... ./internal/services/payments/...
   node --import tsx --test apps/portal/src/lib/__tests__/course-payment-integration-contracts.test.ts
   node --import tsx --test apps/portal/src/lib/__tests__/wallet-dashboard-contracts.test.ts
   node --import tsx --test apps/portal/src/lib/__tests__/authorisation-service-contracts.test.ts
   ```

6. Build immutable production images for the approved services.
7. Run migrations using the existing service migration runner.
8. Deploy through the approved production deployment path.
9. Record image URIs, ECS task definition ARN, migration output, smoke-test output, and rollback target.

### Verification Steps

- WHEN `/api/health` is requested, THEN it returns HTTP 200.
- WHEN `/api/health?deep=1` is requested, THEN database and service dependencies are healthy or known degraded dependencies are explicitly recorded.
- WHEN `/` loads, THEN public open-mat/course discovery still renders.
- WHEN `/open-mats/{id}` loads for a free bookable session, THEN free booking is available only for trusted and booking-verified academies.
- WHEN `/courses/{id}` loads for a paid or donation session, THEN checkout is available only when the academy is trusted, booking-verified, payments-verified, and Stripe/wallet readiness is true.
- WHEN checkout is started for an eligible event, THEN booking creation, payment checkout creation, and booking-payment linking succeed.
- WHEN checkout is attempted for an ineligible academy, THEN the user sees a clear no-charge error.
- WHEN `/dashboard/wallet` loads for a permitted admin, THEN wallet list and linked-account surfaces render without a 401/403/500.
- WHEN a Stripe linked account exists on the relevant academy or academy owner wallet, THEN public event checkout readiness detects it.
- WHEN duplicate wallet creation is attempted, THEN it fails with a conflict and no duplicate wallet row is created.
- WHEN production Terraform RDS state is checked, THEN it remains `backup_retention_period = 3` and `multi_az = false`.

### Rollback Plan

- Method: redeploy previous known-good ECS task definition and image set.
- Data rollback required: No by default; inspect if a migration causes a production incident.
- Manual action required: Yes.

Steps:

1. Capture failing health check, ECS task definition ARN, image URIs, migration output, and CloudWatch errors.
2. Stop the rollout and prevent further production deploy attempts.
3. Redeploy the previous known-good task definition.
4. Wait for ECS service stability.
5. Re-run public health checks:

   ```bash
   curl -fsS https://rollfinders.com/api/health
   curl -fsS 'https://rollfinders.com/api/health?deep=1'
   ```

6. If wallet or authorisation migrations are implicated, do not run destructive SQL rollback automatically. Prepare a service-owned recovery ticket.
7. If RDS settings are accidentally changed, restore the approved cost settings through Terraform:

   ```text
   db_backup_retention_period = 3
   db_multi_az = false
   ```

### Risks

- The current worktree is dirty; deploying before committing or excluding those changes risks releasing an unreviewed artifact.
- Wallet service may not be present in the current production ECS task definition unless explicitly included in the deployment plan.
- Direct service calls from portal server code require correct internal service URLs in the production web container.
- Broad Terraform apply currently has unrelated security group drift/replacement risk.
- Shorter RDS backup retention and Single-AZ remain accepted cost-optimization tradeoffs.
- Payment checkout failures are user-visible and must fail without charging cards.

### Out Of Scope

- Broad Terraform infrastructure apply.
- Security group drift remediation.
- RDS resizing or storage-class migration.
- Subscription catalogue seed or plan changes.
- Manual production data repair outside service-owned migrations.
- New public DNS, ALB, NAT Gateway, or database resources.

## Release Readiness Checklist

- [ ] Decide whether uncommitted files listed in this ticket are included.
- [ ] Commit included files or revert/exclude them from the release.
- [ ] Push final `master` release commit.
- [ ] Update `### Source` with final commit hash.
- [ ] Run pre-release checks.
- [ ] Confirm production approval names the final commit, migration plan, config changes, and rollback plan.
- [ ] Build immutable images.
- [ ] Run service migrations.
- [ ] Deploy production.
- [ ] Record smoke-test and rollback evidence.
