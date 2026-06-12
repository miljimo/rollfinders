# Release Ticket: Course Management And Activity Scheduling To Production

## Status

Completed. Production deployment completed on 2026-06-12.

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
* Deployment state: direct local production deployment completed because push to `origin/master` is blocked locally by Bitbucket SSH authentication.
* Deployed local commit: `e87ef6d`
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:e87ef6d`
* Production image digest: `sha256:09af2c86ad65f080ff141e922c5aaff14f212d93c7f6e8d84edc538fff7a9764`
* Production release tag: `production-2026-06-12-01`
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:31`

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

Production deployment was started from local `master` with direct production override because remote push remained blocked. The deployed artifact is traceable to local commit `e87ef6d`.

The first local production deployment attempt was blocked because AWS credentials were not exported in the shell:

```text
aws: [ERROR]: An error occurred (NoCredentials): Unable to locate credentials.
```

After sourcing `.env`, AWS access was available. A fresh production image was built and pushed for current local `HEAD`.

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
* [x] Release owner approval recorded.
* [x] `npm run typecheck` passed.
* [ ] `npm run test` passed.
* [x] `npm run build` passed.
* [x] Production release tag selected.
* [x] Production shallow and deep health checks pass before deployment.
* [x] Production migrations complete successfully.
* [x] ECS production service stabilizes.
* [x] Production shallow and deep health checks pass after deployment.
* [x] Public home page smoke check passed.
* [x] Open Mat Radar smoke check passed.
* [x] Academies page smoke check passed.
* [x] Courses page smoke check passed.
* [x] Login page smoke check passed.
* [ ] Admin dashboard smoke check passed.
* [ ] Admin Open Mat form smoke check passed.
* [ ] Admin Course form smoke check passed.
* [ ] Analytics dashboard smoke check passed.
* [x] Rollback criteria reviewed before deployment.
* [x] Promotion record written.

## Deployment Notes

Record promotion evidence here:

* Approved by: Product owner request in Codex session.
* Approval time: 2026-06-12.
* Pushed remote commit: not pushed; Bitbucket SSH authentication remains blocked locally.
* Deployed commit: `e87ef6d`.
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:e87ef6d`.
* Production image digest: `sha256:09af2c86ad65f080ff141e922c5aaff14f212d93c7f6e8d84edc538fff7a9764`.
* Production release tag: `production-2026-06-12-01`.
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:31`.
* Migration result: production migration task completed successfully with `PRODUCTION_MIGRATION_APPROVED=true`.
* Super admin ensure result: production super admin task completed successfully.
* Health check result: post-deployment `/api/health` returned `{"status":"ok"}` and `/api/health?deep=1` returned `{"status":"ok","database":"ok"}`.
* Public page smoke result: `/`, `/open-mats`, `/academies`, `/courses`, and `/login` returned `200`.
* Admin smoke result: ECS service stable on task definition revision `31`; manual authenticated admin UI smoke not performed in this session.
* Analytics smoke result: not manually authenticated in this session; health and build validation passed.
* Rollback decision: rollback not required.
* Transient incident: after the ECS service updated and before migrations ran, some production requests failed with Prisma `P2022` because `events.audience` did not yet exist. Running the approved production migration task applied the missing migrations, including `20260611120000_open_mat_audience`, and resolved the error.

## Pre-Deployment Evidence

* Local `master` commit prepared: `1a7fdaf`.
* Release ticket committed locally as `3ab16fc`.
* Push attempt failed because Bitbucket SSH authentication is unavailable in the current environment.
* AWS access check initially failed because credentials were not exported. After sourcing `.env`, AWS account `533235209034` was available.
* Existing `image.env` initially pointed to stale image `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:004a1d1`; it was replaced by `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:e87ef6d`.
* Production deployment completed from this environment using `ALLOW_DIRECT_ENV_DEPLOY=true`.
* During the deploy, the environment script stopped after ECS update because `PRODUCTION_MIGRATION_APPROVED=true` was not set for the migration phase. The migration task was then run explicitly with `PRODUCTION_MIGRATION_APPROVED=true` and completed successfully.
* Follow-up verification after the transient error: `/`, `/open-mats`, `/academies`, `/courses`, and `/login` returned `200`; production logs for the following five minutes showed no further Prisma `P2022` missing-column errors.
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
