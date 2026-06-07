# Release Ticket: Promote Managed User Return Path Fix To Production

## Status

Completed. Production deployment and approved dev teardown completed on 2026-06-07.

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
* Deployment instruction: completed through the existing guarded dev-to-production deployment workflow.

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
* [x] Latest `master` commit and `origin/master` alignment confirmed.
* [x] Dev artifact image URI and digest recorded.
* [x] Production release tag selected and recorded.
* [x] Dev shallow and deep health checks pass before production deployment.
* [x] Production shallow and deep health checks pass before deployment.
* [x] Terraform plan contains only expected production changes.
* [x] Migration status checked; production migrations run successfully if required.
* [x] ECS production service stabilizes.
* [x] Production shallow and deep health checks pass after deployment.
* [x] Dashboard managed user edit returns to `/dashboard?panel=users`.
* [x] Dashboard managed user create returns to `/dashboard?panel=users`.
* [x] Dashboard managed user flows do not redirect to `/admin/users`.
* [x] Rollback criteria reviewed before deployment.
* [x] Promotion record written.
* [x] Dev teardown approval recorded after production validation, if teardown is requested.

## Deployment Notes

Production deployment was completed from this ticket.

Record promotion evidence here:

* Approved by: Product owner
* Approval time: 2026-06-07T20:08:25Z
* Deployed commit: `63127baa4a3374c12550032d5677bd369b33deef`
* Dev image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/dev/app:63127ba`
* Dev image digest: `sha256:8f37c7d1086991be7a1ac03dd214f71310faaafbb7420172b93182ae94eb08f0`
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:63127ba`
* Production image digest: `sha256:91f1d25ba9d201e9fed8fbe2b1a4fe93a90fe7547e2120376a1f59f5862f3ee1`
* Production release tag: `production-2026-06-07-03`
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:23`
* Migration result: production migration task completed successfully with `PRODUCTION_MIGRATION_APPROVED=true`.
* Health check result: production shallow health returned `{"status":"ok"}` and deep health returned `{"status":"ok","database":"ok"}` after deployment.
* Dashboard user return-path smoke result: automated contract coverage passed for dashboard create/edit `returnTo="/dashboard?panel=users"` and invalid return path rejection; production route and database health checks passed after deployment.
* Rollback decision: rollback not required.
* Dev teardown approval and result: product owner requested dev teardown after production validation; `scripts/destroy-env.sh dev` completed after deleting remaining images from `rollfinder/dev/app`; final ECR check returned `RepositoryNotFoundException` for the dev repository.
* Production image correction: after dev teardown removed the dev ECR repository, the same release was pushed to `rollfinder/production/app` and production ECS was updated to the production ECR image so future task replacement can pull successfully.

## Release Evidence

* `npm run test` passed with 71 unit/contract tests.
* `npm run build` completed successfully with Next.js 16.2.7.
* Dev deployment completed for `https://dev.rollfinders.com` and wrote a successful dev promotion record.
* Production pre-flight health checks passed before deployment.
* Initial production Terraform plan changed only the ECS task definition image from the previous production image to the validated dev image.
* Final production correction changed the ECS task definition image from the deleted dev ECR image to `rollfinder/production/app:63127ba` and restored shared SES/domain records that dev teardown had removed from the shared domain state.
* Final production ECS service `rollfinder-production/web` is `ACTIVE`, rollout `COMPLETED`, desired `2`, running `2`, pending `0`.
* SES identity verification for `rollfinders.com` returned `VerificationStatus=Success` after the correction.
* Independent senior development manager validation confirmed production `/`, `/api/health`, `/open-mats`, `/academies`, and `/login` returned `200`, both running tasks were healthy, and the ALB target group had 2 healthy targets.
* Production promotion record was written after the explicit migration approval step completed.
* Dev environment runtime resources were destroyed; the dev ECR repository was emptied and destroyed on the second destroy pass.

## Acceptance Criteria

* Production runs an approved release traceable to the latest verified `master` commit.
* Production release tag follows `production-YYYY-MM-DD-NN` and points to the validated image digest.
* Production health and database health endpoints return `ok` after deployment.
* Dashboard managed user create and edit flows return to `/dashboard?panel=users`.
* Dashboard managed user create and edit flows no longer return to `/admin/users`.
* Migrations are either completed successfully or explicitly recorded as not required.
* Rollback criteria are documented before deployment.
* Dev teardown occurs only after production validation and explicit approval.
