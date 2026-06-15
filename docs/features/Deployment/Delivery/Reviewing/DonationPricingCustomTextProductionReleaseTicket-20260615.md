# Release Ticket: Donation Pricing Custom Text To Production

## Status

Deployed to production on 2026-06-15.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Base commit before feature commit: `116b377 Record production release remote traceability`
* Feature implementation commit: `da5a650 Add custom donation pricing text`
* Release ticket preparation commit: `61a818e Record donation pricing release ticket evidence`
* Deployment evidence commit: current `master` HEAD after this deployment evidence update
* Deployed master commit: `61a818e06584b9ea081e34912d66eeb6d7e570bc`
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:61a818e`
* Production image digest: `sha256:199472311a90adf471740adbb37af6c51d5bd99792d3b4492e83b2ab48d84208`
* Production release tag: `production-2026-06-15-01`
* Production URL: `https://rollfinders.com`
* Requested date: 2026-06-15
* Release owner request: Product owner request in Codex session

## Purpose

Promote optional donation custom display text for open mats and courses to production.

This release includes:

* New nullable `events.donation_label` field.
* Admin course/open-mat form control for Donation Text when pricing is Optional donation.
* Optional `$donation` and `${donation}` placeholders for formatted suggested donation values.
* Existing default labels preserved when Donation Text is blank:
  * `Optional donation`
  * `Optional donation - suggested from £x.xx`
* Custom text without a donation placeholder renders as written.
* Dashboard and dashboard API event projections include the custom donation label.
* Unit coverage for default donation labels and custom placeholder rendering.

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

Completed locally on 2026-06-15:

* `npm run db:generate` passed.
* `npm run typecheck` passed.
* `npm run test:unit` passed: 151/151 tests.
* `npm run lint` passed with warnings only.
* `docker compose --profile app up -d --build` completed successfully, including Next.js production build and Prisma migration deploy.
* Local Docker app is healthy at `http://localhost:3000/api/health`.
* Local migration logs show `20260615120000_event_donation_label` applied successfully.
* Production shallow health returned `{"status":"ok"}` before deployment.
* Production deep health returned `{"status":"ok","database":"ok"}` before deployment.

### Local Docker State

* `rollfinder-app-1` is up and healthy on port `3000`.
* `rollfinder-db-1` is up and healthy on port `54322`.
* Local health check returned `{"status":"ok"}`.

## Risk Classification

* Database migration: low to medium risk because this release adds nullable `events.donation_label`.
* Admin form behavior: low to medium risk because Open Mat and Course creation share the updated form.
* Public price display: low risk because the existing default label path is preserved and covered by tests.
* Deployment sequencing: accepted procedural variance because the existing deploy script updates ECS before running migrations. The migration is nullable and backward-compatible, production migration completed successfully, and post-deploy health checks passed.

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

THEN migration `20260615120000_event_donation_label` SHALL complete successfully during the deployment workflow.

AND the operator SHALL confirm that `events.donation_label` exists and existing event records remain readable.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* `/api/health` returns `ok`.
* `/api/health?deep=1` returns `ok` and database `ok`.
* `/open-mats` returns successfully.
* `/courses` returns successfully.
* Admin course/open-mat create form loads.
* Selecting Optional donation shows Donation Text.
* Blank Donation Text preserves existing optional donation labels.
* Custom Donation Text with `${donation}` renders the formatted suggested amount.
* Custom Donation Text without a placeholder renders as written.
* Editing a listing away from Optional donation clears donation custom text from persisted pricing display.

## Rollback

IF production health checks fail, migrations fail, ECS cannot stabilize, or key public/admin pages fail to render

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture failed task definition, image URI, image digest, release tag, migration logs, and application logs.

AND the operator SHALL roll production back to the last known healthy task definition and image.

AND this ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [x] `master` pushed to `origin/master`.
* [x] Release owner request recorded.
* [x] `npm run db:generate` passed.
* [x] `npm run typecheck` passed.
* [x] `npm run test:unit` passed.
* [x] `npm run lint` passed with warnings only.
* [x] Local Docker build and health check passed.
* [x] Local migration deploy applied `20260615120000_event_donation_label`.
* [x] Production release tag selected.
* [x] Production shallow and deep health checks pass before deployment.
* [x] Production migrations complete successfully.
* [x] ECS production service stabilizes.
* [x] Production shallow and deep health checks pass after deployment.
* [x] Public page smoke checks passed.
* [ ] Authenticated dynamic admin browser smoke checks passed. Blocked locally by missing Playwright/Chromium shared library `libnspr4.so`; authenticated HTTP access to the admin create form succeeded, and client-side Donation Text behavior remains covered by unit/local Docker validation.
* [x] Rollback criteria reviewed before deployment.

## Deployment Notes

Record promotion evidence here:

* Approved by: Product owner request in Codex session.
* Approval time: 2026-06-15.
* Pushed remote commit: `61a818e06584b9ea081e34912d66eeb6d7e570bc` pushed to `origin/master` on 2026-06-15.
* Pushed release tag: `production-2026-06-15-01` pushed to Bitbucket on 2026-06-15.
* Production deployment: completed on 2026-06-15.
* AWS account: `533235209034`.
* Rollback target before deployment: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:33`.
* Production task definition after deployment: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:35`.
* ECS result: production service `rollfinder-production/web` is `ACTIVE`, rollout `COMPLETED`, desired `2`, running `2`, pending `0`.
* Target group result: two healthy targets on port `3000`.
* Migration result: production migration task completed successfully with `PRODUCTION_MIGRATION_APPROVED=true`; CloudWatch logs show `Applying migration 20260615120000_event_donation_label` and `All migrations have been successfully applied`.
* Super admin task result: completed successfully.
* Health check result: production shallow health returned `{"status":"ok"}` and deep health returned `{"status":"ok","database":"ok"}` after deployment.
* Public smoke result: `/open-mats`, `/courses`, `/academies`, and `/login` returned successfully.
* Authenticated admin smoke result: authenticated HTTP access to `/admin/open-mats/new` succeeded; dynamic browser interaction was blocked by missing local Playwright browser dependencies.
* Direct deploy override: used `ALLOW_DIRECT_ENV_DEPLOY=true` because this was an approved direct production deployment from the committed `master` release candidate.
