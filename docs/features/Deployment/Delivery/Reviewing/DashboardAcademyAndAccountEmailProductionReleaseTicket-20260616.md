# Release Ticket: Dashboard Academy Dialogs And Account Email Updates To Production

## Status

Prepared for production deployment on 2026-06-16.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Base commit before release documentation commit: `851f6c6 Reset password send emails`
* Release ticket preparation commit: pending
* Deployed master commit: pending
* Production image: pending
* Production image digest: pending
* Production release tag: pending
* Production URL: `https://rollfinders.com`
* Requested date: 2026-06-16
* Release owner request: Product owner request in Codex session

## Purpose

Promote dashboard academy management and account email refinements to production.

This release includes:

* Dashboard Academies rows open a `View Academy` dialog instead of navigating away from the dashboard.
* Dashboard academy row action menu labels the edit action as `Edit Academy`.
* `Edit Academy` opens the existing Academy form inside a dashboard dialog.
* Academy create/update actions can return to `/dashboard?panel=academies` and revalidate dashboard data.
* Admin-triggered password reset uses the same reset request service as login forgot-password.
* Admin password reset action returns visible success or failure feedback in the Users panel.
* Password reset emails use a RollFinders HTML template with a plain-text fallback.
* Password-changed notifications use matching HTML email styling, include username/email and a reset link, and never include plaintext passwords.

## Deployment Readiness

### Credentials

AWS credentials are expected to be loaded from `.env` before production deployment commands run. Do not write credentials into this ticket, logs, commits, or shell history.

Recommended pre-flight:

```bash
set -a
source .env
set +a
aws sts get-caller-identity
```

### Pre-Deployment Validation

Completed locally on 2026-06-16:

* `npm run typecheck` passed.
* `npm run test:unit -- src/lib/__tests__/UnifiedDashboardRouteContracts.test.ts src/lib/__tests__/admin-password-reset-contracts.test.ts src/lib/__tests__/email-operations-contracts.test.ts` passed: 165/165 tests.
* Local Docker app is healthy at `http://localhost:3000/api/health`.
* Local Docker compose shows `rollfinder-app-1` and `rollfinder-db-1` healthy.
* E2E regression was attempted by test engineer Tina Ugbekile with `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e`, but Chromium could not launch because the local host is missing `libnspr4.so`.
* E2E blocker is host Playwright runtime dependency, not application health. Install with `sudo npx playwright install-deps chromium` and rerun E2E when host access is available.

## Risk Classification

* Database migration: none.
* Data corruption risk: low. This release does not alter schemas, migrations, destructive data operations, or persisted data shapes.
* Dashboard academy dialogs: low to medium UI risk because existing academy view/edit behavior is moved into dialogs on the dashboard.
* Account email delivery: low to medium operational risk because password reset and password-changed emails send immediately through the reliable email path.
* Security risk: reduced compared with plaintext credential email because password-changed notifications explicitly do not include plaintext passwords.

## Production Promotion Requirements

### Remote Traceability

IF production deployment is approved

WHEN deployment is prepared

THEN `master` SHALL be pushed to `origin/master`.

AND the deployed artifact SHALL be traceable to the approved commit.

AND this ticket SHALL be updated with commit SHA, image URI, image digest, ECS task definition, migration result, smoke result, and release tag.

### Current Production Health

IF production deployment is approved

WHEN deployment begins

THEN current production health SHALL pass before changes are applied:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

### Migrations

IF this release is deployed

WHEN production migration execution runs

THEN Prisma migrate SHALL report no pending destructive changes or complete successfully.

AND because this release has no new migration, existing production data SHALL remain readable and unchanged.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* `/api/health` returns `ok`.
* `/api/health?deep=1` returns `ok` and database `ok`.
* `/login` returns successfully.
* `/dashboard?panel=academies` is accessible for an authenticated admin.
* Selecting an academy row opens the `View Academy` dialog without leaving the dashboard.
* Selecting `Edit Academy` opens the Academy form dialog.
* Saving an academy edit returns to `/dashboard?panel=academies`.
* Dashboard Users `Send Password Reset` shows visible feedback.
* Password reset and password-changed emails are queued and immediately attempted through the reliable email path.

## Rollback

IF production health checks fail, ECS cannot stabilize, migrations fail, or key dashboard/login pages fail to render

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture failed task definition, image URI, image digest, release tag, migration logs, and application logs.

AND the operator SHALL roll production back to the last known healthy task definition and image.

AND this ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [ ] `master` pushed to `origin/master`.
* [x] Release owner request recorded.
* [x] `npm run typecheck` passed.
* [x] Targeted unit and contract tests passed.
* [x] Local Docker app health check passed.
* [ ] Production release tag selected.
* [ ] Production shallow and deep health checks pass before deployment.
* [ ] Production migrations complete successfully or report no pending changes.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Public page smoke checks passed.
* [ ] Authenticated dashboard smoke checks passed.
* [x] E2E attempted; blocked by missing local Playwright runtime dependency `libnspr4.so`.
* [x] Rollback criteria reviewed before deployment.

## Deployment Notes

Record promotion evidence here:

* Approved by: Product owner request in Codex session.
* Approval time: 2026-06-16.
* Test engineer: Tina Ugbekile.
* Platform engineer: delegated platform safety review in Codex session.
* Pushed remote commit: pending.
* Pushed release tag: pending.
* Production deployment: pending.
* AWS account: pending.
* Rollback target before deployment: pending.
* Production task definition after deployment: pending.
* ECS result: pending.
* Target group result: pending.
* Migration result: pending.
* Super admin task result: pending.
* Health check result: pending.
* Public smoke result: pending.
* Authenticated admin smoke result: pending.
