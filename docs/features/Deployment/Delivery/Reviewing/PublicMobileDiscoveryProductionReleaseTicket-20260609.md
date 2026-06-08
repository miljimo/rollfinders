# Release Ticket: Public Mobile Discovery To Production

## Status

Reviewing.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current master commit at ticket creation: `bf35433c361e34fe7e7a413ea319db9943f9e385`
* Production URL: `https://rollfinders.com`
* Proposed production release tag: `production-2026-06-09-01`
* Change scope: public home-page mobile simplification, Open Mat Radar mobile count layout, Upcoming Open Mats naming, and Featured Academies review documentation.

## Purpose

Promote the latest `master` public discovery refinements to production while preserving existing discovery, dashboard, authentication, email, and analytics behavior.

This release includes:

* Mobile home-page hero simplification so the primary search and Upcoming Open Mats remain visible sooner.
* Mobile Open Mat Radar count links kept inline on one row.
* Public copy change from `Featured Open Mats` to `Upcoming Open Mats`.
* Removal of the empty home-page Featured Academies shell until the Featured Academies PRD is approved.
* PRD updates for public home-page, Open Mat Radar, shared UI, recurring rolling copy, and Featured Academies review.

## Platform Review Notes

The platform review found no new migration files, no Terraform changes, and no new environment variables in this release candidate.

Risk classification:

* Open Mat Radar mobile count layout: low risk.
* Home-page mobile content hiding and Featured Academies shell removal: medium product risk because public home-page content changes.
* Data query change in `getFeaturedData`: medium product risk because home page no longer fetches academy candidates for a removed section.

Production deployment SHALL still run the normal migration check even though no new migration is expected.

## Production Promotion Requirements

### Release Approval

IF this release is approved

WHEN deployment is started

THEN the operator SHALL deploy the approved `master` commit to production through the existing guarded production deployment workflow.

AND the operator SHALL record the approver, approval time, deployed commit, image URI, image digest, ECS task definition, migration result, smoke result, and production release tag.

### Release Tag

IF production deployment is approved

WHEN the production artifact is prepared

THEN the operator SHALL create or apply a production release tag using the `production-YYYY-MM-DD-NN` format.

AND the release tag SHALL be traceable to commit `bf35433c361e34fe7e7a413ea319db9943f9e385` or a later explicitly approved `master` commit.

### Artifact Traceability

IF production deployment is prepared

WHEN the operator starts the deploy

THEN the operator SHALL confirm `master` is aligned with `origin/master`.

AND the deployed artifact SHALL be traceable to the approved `master` commit.

AND any direct production deployment override SHALL be recorded in this ticket.

### Health Checks

IF production deployment is approved

WHEN pre-flight validation runs

THEN current production health SHALL pass before deployment:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

AND production health SHALL pass again after ECS service stabilization.

### Migrations

IF database migrations are pending for the approved commit

WHEN production deployment runs

THEN the production migration task SHALL complete successfully before smoke checks.

AND if no migrations are pending, the operator SHALL record that migration status was checked and no migration task was required beyond the standard deploy check.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* `/api/health` returns `ok`.
* `/api/health?deep=1` returns `ok` and database `ok`.
* `/` returns successfully and renders the public home page.
* `/open-mats` returns successfully and renders Open Mat Radar.
* `/academies` returns successfully.
* `/login` returns successfully.
* Public home page uses `Upcoming Open Mats`.
* Mobile Open Mat Radar count cards remain inline without horizontal overflow.
* Authentication and dashboard routes are not regressed by this public-page release.

### Rollback

IF production health checks fail, migrations fail, ECS cannot stabilize, or key public pages fail to render

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture the failed task definition, image URI, image digest, release tag, and relevant logs.

AND the operator SHALL roll production back to the last known healthy production task definition and image.

AND this ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [ ] Release owner approval recorded.
* [x] `master` and `origin/master` alignment confirmed.
* [x] `npm run typecheck` passed.
* [x] Unit tests passed.
* [x] Production build passed.
* [ ] Production release tag selected and recorded.
* [ ] Production shallow and deep health checks pass before deployment.
* [ ] Migration status checked; production migrations run successfully if required.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Public home page smoke check passed.
* [ ] Open Mat Radar smoke check passed.
* [ ] Academies page smoke check passed.
* [ ] Login page smoke check passed.
* [ ] Mobile public layout smoke check passed.
* [ ] Rollback criteria reviewed before deployment.
* [ ] Promotion record written.

## Deployment Notes

Record promotion evidence here:

* Approved by:
* Approval time:
* Deployed commit:
* Production image:
* Production image digest:
* Production release tag:
* Production task definition:
* Migration result:
* Health check result:
* Public page smoke result:
* Rollback decision:

## Pre-Deployment Evidence

* `master` and `origin/master` aligned at `bf35433c361e34fe7e7a413ea319db9943f9e385` before ticket creation.
* `npm run test` passed, including typecheck and 99 unit/contract tests.
* `npm run build` passed with Next.js 16.2.7.
* Platform review found no new migration files, no Terraform changes, and no new environment variables for this release candidate.

## Acceptance Criteria

* Production runs a release traceable to the approved `master` commit.
* Production release tag follows `production-YYYY-MM-DD-NN`.
* Production health and database health endpoints return `ok` after deployment.
* Public home page, Open Mat Radar, Academies, and Login routes render successfully.
* Mobile Open Mat Radar count cards remain inline without page-level horizontal overflow.
* Existing authentication, dashboard, email, and analytics behavior remains operational.
