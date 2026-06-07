# Release Ticket: Promote Latest Dev Master To Production

## Status

Done on 2026-06-07.

## Release Candidate

* Source environment: `dev`
* Target environment: `production`
* Source branch: `master`
* Commit: `a0d5479db3285f7b1a149d78a4960bb5fd8fa0a4`
* Dev image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/dev/app:a0d5479`
* Dev image digest: `sha256:6789e691b1ae9ce0504e5417a64406af5461ac863332a30ffc7fa682ae35f202`
* Dev URL: `https://dev.rollfinders.com`
* Production URL: `https://rollfinders.com`
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:a0d5479`
* Production release tag: `production-2026-06-07-02`
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:19`
* Requested date: 2026-06-07
* Deployment mode: direct dev/master to production override requested by product owner.

## Purpose

Promote the latest verified dev/master release to production.

This release includes:

* Reusable admin side panel control with expanded desktop sidebar, collapsed rail, mobile drawer, and 70px brand mark.
* Open Mat recurrence UI simplification by removing the admin-facing occurrence limit field.
* Reusable quick action panel and stats panel changes currently present on `master`.

## Production Promotion Requirements

### Release Approval

IF the release owner approves this ticket

WHEN deployment is started

THEN the operator SHALL deploy the verified `master` release to production using the existing deployment process.

AND because the requested path is direct dev/master to production, the operator SHALL set and record the direct deployment override.

### Artifact Traceability

IF the release is promoted

WHEN the production deployment is prepared

THEN the deployed artifact SHALL be traceable to commit `a0d5479db3285f7b1a149d78a4960bb5fd8fa0a4`.

AND the release notes SHALL record the image URI and digest used for production.

AND the operator SHALL not deploy an untracked local image.

### Pre-Production Checks

IF production deployment is approved

WHEN deployment begins

THEN the operator SHALL confirm that `master` is aligned with `origin/master`.

AND the operator SHALL confirm that dev health checks pass:

* `https://dev.rollfinders.com/api/health`
* `https://dev.rollfinders.com/api/health?deep=1`

AND the operator SHALL confirm that current production health checks pass before release:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

### Deployment Execution

IF the release is promoted to production

WHEN the deployment runs

THEN the deployment SHALL acquire the deployment lock.

AND Terraform SHALL apply only the expected production task definition/image change unless explicitly approved.

AND migrations SHALL run successfully.

AND the super admin bootstrap SHALL run successfully.

AND the production smoke checks SHALL pass:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

AND the deployment lock SHALL be released.

### Rollback

IF production health checks fail after deployment

WHEN the failure is confirmed

THEN the operator SHALL capture the failed task definition, image URI, and relevant logs.

AND the operator SHALL roll production back to the last known healthy production image.

AND the release ticket SHALL be updated with the rollback reason and follow-up action.

## Validation Checklist

* [x] Product owner requested production deployment.
* [x] Direct dev/master to production override recorded.
* [x] Confirm `master` equals `origin/master` before deployment.
* [x] Confirm dev image exists in ECR with digest `sha256:6789e691b1ae9ce0504e5417a64406af5461ac863332a30ffc7fa682ae35f202`.
* [x] Confirm dev shallow and deep health checks pass before deployment.
* [x] Confirm production shallow and deep health checks pass before deployment.
* [x] Confirm production deployment plan contains only expected changes.
* [x] Confirm production migrations complete.
* [x] Confirm production smoke checks pass.
* [x] Confirm production promotion record is written.

## Deployment Notes

Pre-checks completed at `2026-06-07T13:58:20Z`:

* Dev `/api/health`: `ok`
* Dev `/api/health?deep=1`: `ok`, database `ok`
* Production `/api/health`: `ok`
* Production `/api/health?deep=1`: `ok`, database `ok`

Direct production deployment override is being used because the product owner requested deploying the latest dev/master release directly to production.

Deployment completed on 2026-06-07:

* Production ECR tag `a0d5479` pushed with digest `sha256:6789e691b1ae9ce0504e5417a64406af5461ac863332a30ffc7fa682ae35f202`.
* Production ECR release tag `production-2026-06-07-02` pushed with the same digest.
* Terraform plan contained only the expected ECS task definition image change from `production-2026-06-07-01` to `production/app:a0d5479`.
* ECS service `rollfinder-production/web` stabilized on task definition revision `19`.
* Academy claim invitation template validation and S3 upload completed.
* Production migration task completed successfully.
* Production super admin ensure task completed successfully.
* Production smoke checks passed:
  * `/api/health`: `ok`
  * `/api/health?deep=1`: `ok`, database `ok`
* Production promotion record was written.
* Deployment lock was released.

## Acceptance Criteria

* Production runs a release traceable to commit `a0d5479db3285f7b1a149d78a4960bb5fd8fa0a4`.
* Production health and database health endpoints return `ok` after deployment.
* Admin side panel changes are available in production.
* Open Mat recurrence form no longer exposes the occurrence limit field in production.
* No unrelated production infrastructure changes are applied without approval.
