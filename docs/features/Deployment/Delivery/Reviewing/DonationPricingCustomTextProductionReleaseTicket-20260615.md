# Release Ticket: Donation Pricing Custom Text To Production

## Status

Ready for production promotion.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Base commit before feature commit: `116b377 Record production release remote traceability`
* Feature commit: pending local commit
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

### Local Docker State

* `rollfinder-app-1` is up and healthy on port `3000`.
* `rollfinder-db-1` is up and healthy on port `54322`.
* Local health check returned `{"status":"ok"}`.

## Risk Classification

* Database migration: low to medium risk because this release adds nullable `events.donation_label`.
* Admin form behavior: low to medium risk because Open Mat and Course creation share the updated form.
* Public price display: low risk because the existing default label path is preserved and covered by tests.

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

THEN migration `20260615120000_event_donation_label` SHALL complete successfully before the ECS service is updated.

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

* [ ] `master` pushed to `origin/master`.
* [ ] Release owner request recorded.
* [x] `npm run db:generate` passed.
* [x] `npm run typecheck` passed.
* [x] `npm run test:unit` passed.
* [x] `npm run lint` passed with warnings only.
* [x] Local Docker build and health check passed.
* [x] Local migration deploy applied `20260615120000_event_donation_label`.
* [ ] Production release tag selected.
* [ ] Production shallow and deep health checks pass before deployment.
* [ ] Production migrations complete successfully.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Public page smoke checks passed.
* [ ] Authenticated admin smoke checks passed.
* [x] Rollback criteria reviewed before deployment.

## Deployment Notes

Record promotion evidence here:

* Approved by: Product owner request in Codex session.
* Approval time: 2026-06-15.
* Pushed remote commit: pending.
* Pushed release tag: pending.
* Production deployment: pending.
