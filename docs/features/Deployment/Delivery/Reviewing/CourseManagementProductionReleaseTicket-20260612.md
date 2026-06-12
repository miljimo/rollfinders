# Release Ticket: Course Management And Activity Scheduling To Production

## Status

Reviewing. Not deployed.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current local master commit at ticket creation: `1a7fdaf feat: add course management and activity scheduling`
* Commits ahead of `origin/master` at ticket creation:
  * `1a7fdaf feat: add course management and activity scheduling`
  * `bf29955 feat: add flexible academy social links`
  * `da640d3 feat: support custom open mat recurrence`
  * `2cfb4a3 save product review changes`
* Production URL: `https://rollfinders.com`
* Requested date: 2026-06-12
* Deployment state: push to `origin/master` is blocked locally by Bitbucket SSH authentication.

## Purpose

Promote course management and activity scheduling changes to production while preserving existing public discovery, open mat, academy, dashboard, authentication, analytics, and email behavior.

This release includes:

* Course persistence foundation and course activity management migrations.
* Admin course create/edit/list surfaces.
* Public course listing and course detail surfaces.
* Open Mat form updates for course-oriented scheduling, activity rows, recurrence, pricing audience, and instructor support.
* Public listing warning and return-path improvements.
* Analytics support for course views, course searches, and course supply events.
* Documentation and ticket updates for the course-management release scope.

## Deployment Blocker

The local push attempt failed:

```text
git@bitbucket.org: Permission denied (publickey).
fatal: Could not read from remote repository.
```

Production deployment SHALL NOT start until `master` is pushed to the remote repository and the deployed artifact is traceable to the approved remote commit.

## Risk Classification

* Database migrations: high risk because this release adds course and activity persistence.
* Public course pages: medium risk because this adds new public discovery routes.
* Open Mat form changes: medium risk because existing open mat creation/edit workflows share the updated form.
* Analytics changes: medium risk because new event names and reporting dimensions are introduced.
* Existing public academy/open mat pages: medium risk because they now consume course-aware event data.

## Production Promotion Requirements

### Remote Traceability

IF production deployment is approved

WHEN deployment is prepared

THEN `master` SHALL be pushed to `origin/master`.

AND the deployed artifact SHALL be traceable to the approved remote commit.

AND the release record SHALL include the commit SHA, image URI, image digest, ECS task definition, migration result, smoke result, and production release tag.

### Pre-Deployment Validation

IF production deployment is approved

WHEN pre-flight validation runs

THEN these local and CI checks SHALL pass:

* `npm run typecheck`
* `npm run test`
* `npm run build`
* Prisma migration validation for the production database target.

### Current Production Health

IF production deployment is approved

WHEN deployment begins

THEN current production health SHALL pass before changes are applied:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

### Migrations

IF this release is deployed

WHEN production migration execution runs

THEN the migration task SHALL complete successfully before the ECS service is updated.

AND the operator SHALL confirm that existing academy, open mat, user, analytics, and email tables remain available after migration.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* `/api/health` returns `ok`.
* `/api/health?deep=1` returns `ok` and database `ok`.
* `/` returns successfully.
* `/open-mats` returns successfully.
* `/academies` returns successfully.
* `/courses` returns successfully.
* `/login` returns successfully.
* Admin dashboard loads for a permitted admin.
* Admin Open Mat create/edit form still renders and can preserve existing open mat fields.
* Admin Course create/edit form renders.
* Public Open Mat detail pages still render course-aware schedules without breaking existing open mat details.
* Analytics dashboard loads without breaking visitor, search, profile, commercial intent, claim, and supply metrics.

### Rollback

IF production health checks fail, migrations fail, ECS cannot stabilize, or key public/admin pages fail to render

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture the failed task definition, image URI, image digest, release tag, migration logs, and relevant application logs.

AND the operator SHALL roll production back to the last known healthy task definition and image.

AND this ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [ ] `master` pushed to `origin/master`.
* [ ] `master` and `origin/master` alignment confirmed.
* [ ] Release owner approval recorded.
* [x] `npm run typecheck` passed.
* [ ] `npm run test` passed.
* [x] `npm run build` passed.
* [ ] Production release tag selected.
* [x] Production shallow and deep health checks pass before deployment.
* [ ] Production migrations complete successfully.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Public home page smoke check passed.
* [ ] Open Mat Radar smoke check passed.
* [ ] Academies page smoke check passed.
* [ ] Courses page smoke check passed.
* [ ] Login page smoke check passed.
* [ ] Admin dashboard smoke check passed.
* [ ] Admin Open Mat form smoke check passed.
* [ ] Admin Course form smoke check passed.
* [ ] Analytics dashboard smoke check passed.
* [ ] Rollback criteria reviewed before deployment.
* [ ] Promotion record written.

## Deployment Notes

Record promotion evidence here:

* Approved by:
* Approval time:
* Pushed remote commit:
* Deployed commit:
* Production image:
* Production image digest:
* Production release tag:
* Production task definition:
* Migration result:
* Health check result:
* Public page smoke result:
* Admin smoke result:
* Analytics smoke result:
* Rollback decision:

## Pre-Deployment Evidence

* Local `master` commit prepared: `1a7fdaf`.
* Push attempt failed because Bitbucket SSH authentication is unavailable in the current environment.
* Production deployment has not been started from this environment.
* `npm run typecheck` passed on 2026-06-12.
* `npm run build` passed on 2026-06-12 with Next.js 16.2.7 and generated `/courses`, `/courses/[id]`, `/admin/courses`, `/admin/courses/new`, and `/admin/courses/[id]` routes.
* Current production health passed before deployment on 2026-06-12:
  * `https://rollfinders.com/api/health` returned `{"status":"ok"}`.
  * `https://rollfinders.com/api/health?deep=1` returned `{"status":"ok","database":"ok"}`.
* `npm run test` did not pass because the existing `supports SMTP delivery fallback behind environment configuration` email operations contract still expects `smtpUsername: process.env.SMTP_USERNAME`, while the implementation currently uses `getEnvVariable("SMTP_USERNAME", "")`. The rest of the suite passed: 144 passed, 1 failed.

## Acceptance Criteria

* Production runs a release traceable to the approved remote `master` commit.
* Production health and database health endpoints return `ok` after deployment.
* Course management and activity scheduling work in admin surfaces.
* Public course pages render successfully.
* Existing public home, academy, open mat, login, dashboard, analytics, and email behavior remains operational.
* Rollback instructions and release evidence are recorded before closing this ticket.
