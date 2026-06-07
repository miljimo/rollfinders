# Release Ticket: Promote Dev To Production

## Status

Reviewing

## Release Candidate

* Source environment: `dev`
* Target environment: `production`
* Commit: `a0b4c74`
* Dev image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/dev/app:duplicate-user-email-a0b4c74`
* Dev URL: `https://dev.rollfinders.com`
* Requested date: 2026-06-07

## Purpose

Promote the currently verified dev release to production after product and operational approval.

This release includes:

* Shared stat indicator PRD implementation for admin metric cards.
* Completed stat indicator PRD documentation moves.
* Duplicate admin user email handling so the admin board shows a controlled validation message instead of a server error.

## Production Promotion Requirements

### Release Approval

IF the release owner approves this ticket

WHEN deployment is started

THEN the operator SHALL promote the verified dev release toward production using the existing deployment process.

AND the operator SHALL confirm whether staging promotion is required before production.

AND any direct production deployment override SHALL be explicitly recorded in the deployment notes.

### Artifact Traceability

IF the release is promoted

WHEN the production deployment is prepared

THEN the deployed artifact SHALL be traceable to commit `a0b4c74`.

AND the release notes SHALL record the image URI and digest used for production.

AND the operator SHALL not deploy an untracked local image.

### Pre-Production Checks

IF production deployment is approved

WHEN deployment begins

THEN the operator SHALL confirm that `master` is aligned with `origin/master`.

AND the operator SHALL confirm that dev health checks pass:

* `https://dev.rollfinders.com/api/health`
* `https://dev.rollfinders.com/api/health?deep=1`

AND the operator SHALL review recent dev logs for the duplicate user email server error.

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

* [ ] Product owner approves promoting this release.
* [ ] Confirm whether staging promotion is required.
* [ ] Confirm `master` equals `origin/master`.
* [ ] Confirm dev ECS rollout is completed.
* [ ] Confirm dev shallow and deep health checks pass.
* [ ] Confirm duplicate admin user email flow no longer produces a server error in dev.
* [ ] Confirm production deployment plan contains only expected changes.
* [ ] Confirm production migrations complete.
* [ ] Confirm production smoke checks pass.
* [ ] Confirm production promotion record is written.

## Acceptance Criteria

* Production runs a release traceable to commit `a0b4c74`.
* Production health and database health endpoints return `ok`.
* Admin duplicate user email creation does not produce a generic server error.
* Admin stat indicators render with factual indicator copy.
* No unrelated production infrastructure changes are applied without approval.
