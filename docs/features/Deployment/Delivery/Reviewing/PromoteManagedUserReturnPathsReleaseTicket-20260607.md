# Release Ticket: Promote Managed User Return Path Fix To Production

## Status

Approved for production deployment by the product owner in chat on 2026-06-07.

## Release Candidate

* Source environment: `dev`
* Target environment: `production`
* Source branch: `master`
* Current master commit at ticket approval: `63900187be2ee602eec6d5ae287135a06cf01f62`
* Change scope: managed user create/edit return paths for dashboard user management.
* Expected behavior: dashboard user create/edit flows return to `/dashboard?panel=users` instead of `/admin/users`.
* Dev URL: `https://dev.rollfinders.com`
* Production URL: `https://rollfinders.com`
* Production release tag: `production-2026-06-07-03`
* Deployment instruction: deploy after the release ticket and final verification are committed and pushed.

## Purpose

Promote the latest verified dev/master change that fixes managed user create/edit return paths so dashboard user edits return operators to the dashboard users panel.

This release is limited to the current master behavior for:

* Successful managed user creation from the dashboard users panel.
* Successful managed user editing from the dashboard users panel.
* Regression protection that the dashboard workflow does not redirect back to `/admin/users`.

## Production Promotion Requirements

### Release Approval

IF the release owner approves this ticket

WHEN deployment is started

THEN the operator SHALL promote the latest verified `dev` artifact from `master` to production using the existing deployment process.

AND the operator SHALL record the approver, approval time, deployed commit, image URI, image digest, ECS task definition, and production release tag.

### Release Tag

IF production promotion is approved

WHEN the production image is prepared

THEN the operator SHALL create or apply the next production release tag using the `production-YYYY-MM-DD-NN` format.

AND the release tag SHALL point to the same image digest that passed dev validation.

AND production SHALL NOT be updated with an untagged or locally rebuilt image.

### Artifact Traceability

IF the release is promoted

WHEN deployment is prepared

THEN the deployed artifact SHALL be traceable to the latest approved `master` commit.

AND the operator SHALL confirm `master` is aligned with `origin/master` before deployment.

AND the operator SHALL record any direct dev/master to production override if the normal gate is bypassed.

### Health Checks

IF production deployment is approved

WHEN deployment begins

THEN the operator SHALL confirm dev health checks pass:

* `https://dev.rollfinders.com/api/health`
* `https://dev.rollfinders.com/api/health?deep=1`

AND the operator SHALL confirm current production health checks pass before release:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

AND the operator SHALL repeat production health checks after ECS service stabilization.

### Migrations

IF database migrations are pending for the approved commit

WHEN production deployment runs

THEN the operator SHALL run the production migration task successfully before validating user workflows.

AND if no migrations are pending, the operator SHALL record that migration status was checked and no migration task was required.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* Basic production health endpoint returns `ok`.
* Deep production health endpoint returns `ok` and database `ok`.
* A platform admin can open `/dashboard?panel=users`.
* A managed user edit submitted from the dashboard users panel returns to `/dashboard?panel=users`.
* A managed user create submitted from the dashboard users panel returns to `/dashboard?panel=users`.
* The same workflows do not unexpectedly redirect dashboard operators to `/admin/users`.

### Rollback

IF production health checks fail, migrations fail, ECS cannot stabilize, or dashboard user create/edit returns to `/admin/users`

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture the failed task definition, image URI, image digest, release tag, and relevant logs.

AND the operator SHALL roll production back to the last known healthy production task definition and image.

AND the release ticket SHALL be updated with the rollback reason, user impact, and follow-up action.

### Dev Teardown

IF production validation passes

WHEN the release owner approves dev teardown

THEN the operator SHALL tear down only the approved dev resources using the existing environment destruction process.

AND teardown SHALL occur only after production health checks and dashboard user return-path smoke checks pass.

AND the operator SHALL record teardown approval, teardown command or pipeline, completion time, and any retained resources.

## Validation Checklist

* [x] Release owner approval recorded.
* [ ] Latest `master` commit and `origin/master` alignment confirmed.
* [ ] Dev artifact image URI and digest recorded.
* [x] Production release tag selected and recorded.
* [ ] Dev shallow and deep health checks pass before production deployment.
* [ ] Production shallow and deep health checks pass before deployment.
* [ ] Terraform plan contains only expected production changes.
* [ ] Migration status checked; production migrations run successfully if required.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Dashboard managed user edit returns to `/dashboard?panel=users`.
* [ ] Dashboard managed user create returns to `/dashboard?panel=users`.
* [ ] Dashboard managed user flows do not redirect to `/admin/users`.
* [ ] Rollback criteria reviewed before deployment.
* [ ] Promotion record written.
* [ ] Dev teardown approval recorded after production validation, if teardown is requested.

## Deployment Notes

Pending approval. No deployment has been performed from this ticket.

Record promotion evidence here:

* Approved by: Product owner
* Approval time: 2026-06-07T20:08:25Z
* Deployed commit:
* Dev image:
* Dev image digest:
* Production image:
* Production release tag: `production-2026-06-07-03`
* Production task definition:
* Migration result:
* Health check result:
* Dashboard user return-path smoke result:
* Rollback decision:
* Dev teardown approval and result:

## Acceptance Criteria

* Production runs an approved release traceable to the latest verified `master` commit.
* Production release tag follows `production-YYYY-MM-DD-NN` and points to the validated image digest.
* Production health and database health endpoints return `ok` after deployment.
* Dashboard managed user create and edit flows return to `/dashboard?panel=users`.
* Dashboard managed user create and edit flows no longer return to `/admin/users`.
* Migrations are either completed successfully or explicitly recorded as not required.
* Rollback criteria are documented before deployment.
* Dev teardown occurs only after production validation and explicit approval.
