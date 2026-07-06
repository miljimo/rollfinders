# Release Ticket: Academy Coordinate Lookup Hotfix To Production

## Status

Ready for production approval. Prepared on 2026-06-08.

## Release Candidate

* Source environment: `master`
* Target environment: `production`
* Source branch: `master`
* Hotfix commit validated: `c8a179be1cdddbfe3417ed7ba4f940609446041f`
* Current `origin/master` at preparation time: `c8a179be1cdddbfe3417ed7ba4f940609446041f`
* Change scope: New Academy location step coordinate lookup and manual latitude/longitude override handling.
* Expected behavior: admins can auto-fill academy latitude and longitude from postcode or address, can manually enter coordinates, and manual edits are not overwritten by automatic lookup unless the admin explicitly chooses lookup again.
* Production URL: `https://rollfinders.com`
* Planned production release tag: `production-2026-06-08-01`
* Deployment mode: hotfix direct `master` to production override because the dev environment is not available after prior approved teardown.

## Purpose

Promote the academy coordinate lookup hotfix to production carefully while preserving the existing guarded release pattern.

This hotfix is limited to:

* `New Academy` guided setup location step.
* Admin-only coordinate lookup endpoint.
* Coordinate validation bounds for latitude and longitude.
* Focused tests for coordinate lookup, manual override, and schema validation.

No database migration is introduced by this hotfix.

## Production Promotion Requirements

### Release Approval

IF the release owner approves this hotfix

WHEN deployment is started

THEN the operator SHALL deploy the validated `master` release to production using the existing deployment scripts.

AND because the dev environment is unavailable, the operator SHALL record the direct production deployment override.

AND the operator SHALL record the approver, approval time, deployed commit, image URI, image digest, ECS task definition, production release tag, migration result, and smoke result.

### Artifact Traceability

IF the hotfix is promoted

WHEN the production image is prepared

THEN the deployed artifact SHALL be traceable to `c8a179be1cdddbfe3417ed7ba4f940609446041f` or a later docs-only release-ticket commit that contains the same application code.

AND the production release notes SHALL record the image URI and digest used for production.

AND the operator SHALL not deploy an untracked local image.

### Pre-Production Checks

IF production deployment is approved

WHEN deployment begins

THEN the operator SHALL confirm that `master` is aligned with `origin/master`.

AND the operator SHALL confirm current production health checks pass before release:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`

AND the operator SHALL record that dev health checks are unavailable if `dev.rollfinders.com` still does not resolve.

### Deployment Execution

IF the hotfix is promoted to production

WHEN the deployment runs

THEN the deployment SHALL acquire the deployment lock.

AND Terraform SHALL apply only the expected production task definition/image change unless explicitly approved.

AND production migrations SHALL run with `PRODUCTION_MIGRATION_APPROVED=true`; this hotfix has no new Prisma migration files, so the task is expected to report no pending schema work.

AND the super admin bootstrap SHALL run successfully.

AND the production smoke checks SHALL pass:

* `https://rollfinders.com/api/health`
* `https://rollfinders.com/api/health?deep=1`
* `/dashboard?panel=academies&dialog=new-academy` renders for an authorized platform admin.
* Entering a valid UK postcode or address in the Location step fills latitude and longitude.
* Manually editing latitude or longitude marks the coordinates as manual and prevents implicit overwrite.

### Rollback

IF production health checks fail, ECS cannot stabilize, migrations fail, or the New Academy flow cannot create academy records

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture the failed task definition, image URI, image digest, release tag, and relevant logs.

AND the operator SHALL roll production back to the last known healthy production task definition and image.

AND the release ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [x] Hotfix owner requested production preparation.
* [x] Confirmed `master` equals `origin/master` at `c8a179be1cdddbfe3417ed7ba4f940609446041f`.
* [x] Validated release candidate in a clean worktree.
* [x] `npm ci` completed in the clean release worktree.
* [x] `npm run db:generate` passed.
* [x] `npm run lint` passed with warnings only.
* [x] `npm run typecheck` passed.
* [x] `npm run test` passed with 76 tests.
* [x] `npm run build` passed.
* [x] `terraform fmt -check` passed.
* [x] `terraform init -backend=false` passed.
* [x] `terraform validate` passed.
* [x] Production shallow health check passed before deployment.
* [x] Production deep health check passed before deployment.
* [x] Dev health check exception recorded because `dev.rollfinders.com` does not resolve.
* [x] Rollback criteria documented before deployment.
* [ ] Product owner approval recorded.
* [ ] Production image URI and digest recorded.
* [ ] Production release tag applied.
* [ ] Production deployment plan reviewed.
* [ ] Production migration task completed.
* [ ] ECS production service stabilized.
* [ ] Production smoke checks passed after deployment.
* [ ] Promotion record written.

## Pre-Deployment Evidence

Prepared at `2026-06-08T18:17:37Z`.

Clean worktree path used for validation:

* `/tmp/rollfinder-hotfix-release`

Release candidate commit:

* `c8a179be1cdddbfe3417ed7ba4f940609446041f`

Changed files in the hotfix application scope:

* `apps/portal/docs/features/Users/Academies/Products/Completed/NewAcademyMultiStepExperiencePrd.md`
* `src/app/admin/__tests__/AcademyCoordinateAutofillContract.test.ts`
* `src/app/admin/academies/AcademyForm.tsx`
* `src/app/api/admin/geocode/route.ts`
* `src/lib/__tests__/academy-coordinate-validation.test.ts`
* `src/lib/__tests__/geocoding.test.ts`
* `src/lib/geocoding.ts`
* `src/lib/validators.ts`

Validation results:

* `npm run db:generate` passed.
* `npm run lint` passed with warnings only:
  * `src/app/admin/academies/AcademyForm.tsx`: `ClassicAcademyForm` is defined but never used.
  * `src/app/dashboard/page.tsx`: `rollCount` is defined but never used.
* `npm run typecheck` passed.
* `npm run test` passed with 76 tests.
* `npm run build` passed with Next.js 16.2.7.
* `terraform fmt -check` passed.
* `terraform init -backend=false` passed.
* `terraform validate` passed.

Pre-release health:

* Production `/api/health`: `{"status":"ok"}`
* Production `/api/health?deep=1`: `{"status":"ok","database":"ok"}`
* Dev health: `dev.rollfinders.com` did not resolve, so this hotfix must use the recorded direct production override.

## Deployment Instructions

Preferred guarded hotfix path:

1. Confirm approval and export production gates:

```bash
export ENVIRONMENT_NAME=production
export PRODUCTION_APPROVED=true
export PRODUCTION_MIGRATION_APPROVED=true
export ALLOW_DIRECT_ENV_DEPLOY=true
export BITBUCKET_TAG=production-2026-06-08-01
```

2. Build and push the production image from the approved `master` commit:

```bash
scripts/cicd/prepare-ecr.sh
scripts/cicd/build.sh
```

3. Deploy through the environment script so the deployment lock, Terraform, migration, super-admin bootstrap, smoke checks, and promotion record are handled:

```bash
scripts/cicd/deploy-environment.sh
```

4. Record image URI, digest, task definition, production release tag, migration result, smoke checks, and rollback decision in this ticket.

## Acceptance Criteria

* Production runs a release traceable to the approved `master` hotfix.
* Production release tag follows `production-YYYY-MM-DD-NN`.
* Production health and database health endpoints return `ok` after deployment.
* New Academy coordinate lookup works for a valid postcode or address.
* Manual latitude and longitude entry remains available.
* Manual coordinate edits are not overwritten by automatic lookup unless the admin explicitly chooses lookup.
* No unrelated production infrastructure changes are applied without approval.
