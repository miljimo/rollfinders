# Name: RELEASE-20260706 - Promote Portal Discovery And Service-Local Refactors To Production

## Feature / Component

- Feature: Production Release
- Component: Portal public discovery, public site content, dashboard refactor, backend service documentation, service-local migrations, deployment scripts
- Priority: P0
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Production approval, production image build, migration-path validation, smoke-test access
- Source PRD: `docs/features/Deployment/Delivery/Reviewing/PortalDiscoveryAndServiceDocsProductionReleaseTicket-20260706.md`

## Goal

Release `master` commit `9f2aaa27c0ac75802235f3deee05881891fc969a` to production while preserving public discovery, dashboard access, and service migration safety.

## Scope

The release agent must:

- Deploy source commit `9f2aaa27c0ac75802235f3deee05881891fc969a` from `master`.
- Validate the updated public home page as the primary open-mat discovery page.
- Validate public event pagination, search filters, and default recurring occurrence capping.
- Validate the restored `/about` page and footer About link.
- Validate dashboard refactor routes still load for authorised users.
- Validate service-local migration paths under `apps/backend_api/internal/services/<service>/migrations`.
- Validate service-local documentation paths under `apps/backend_api/internal/services/<service>/docs` and portal docs under `apps/portal/docs`.
- Record production image digests, task definition ARNs, migration output, and smoke-test evidence.

The release agent must not:

- Deploy a different commit without updating this ticket.
- Add new infrastructure, DNS, ALB listeners, NAT Gateways, databases, or public service endpoints.
- Run destructive database rollback automatically.
- Treat archived docs as implementation commitments.
- Deploy if migration scripts still expect removed `apps/backend_api/migrations/<service>` paths.

## Implementation Notes

- Source branch: `master`
- Source commit: `9f2aaa27c0ac75802235f3deee05881891fc969a`
- Short commit: `9f2aaa2 Refactor service docs and refresh portal discovery`
- Database schema impact: no new schema design is intended, but migration file locations changed and must be validated in deployment scripts.
- Config impact: no new environment variables are expected for the portal discovery changes.
- Infrastructure impact: no new infrastructure is expected.
- Production runtime: Next.js portal and Go backend services on ECS/Fargate.
- Deployment should use existing deployment scripts and existing production secrets.

## Release Contents

- Public home page is now the main event discovery page.
- `/open-mats` redirects to `/` while preserving query parameters.
- Public event results paginate through all currently visible training sessions and show `n of n pages`.
- Default public discovery caps recurring course occurrences to 3 visible occurrences per recurring course.
- Date-intent searches such as `today`, `tomorrow`, and `weekend` remain uncapped.
- Public header has simplified navigation: `Find a Place`, `Academies`, and authenticated/login action.
- Public home search and event cards have refreshed styling.
- `/about` is restored with the London-focused RollFinders narrative and linked from the footer.
- Dashboard workspace and wallet/academy panels were split into smaller domain-local components.
- Backend service docs moved to service-local `docs` folders.
- Backend SQL migrations moved to service-local `migrations` folders.
- Top-level docs now describe shared documentation ownership and archive semantics.

## Required Pre-Release Checks

Run from the repository root unless noted:

```bash
git status -sb
git rev-parse HEAD
npm ci
npm run db:generate
npm run typecheck
npm run build
cd apps/backend_api && go test ./...
```

Run release-specific path checks:

```bash
rg -n 'apps/backend_api/migrations|docs/services/' scripts apps/backend_api apps/portal docs
rg -n 'internal/services/.*/migrations' scripts apps/backend_api
rg -n 'internal/services/.*/docs|apps/portal/docs' docs apps/portal apps/backend_api
```

Run targeted portal route checks locally:

```bash
curl -fsS http://localhost:3000 >/dev/null
curl -fsS http://localhost:3000/about >/dev/null
curl -fsS 'http://localhost:3000/?page=2' >/dev/null
curl -fsS 'http://localhost:3000/?when=today' >/dev/null
curl -fsS http://localhost:3000/academies >/dev/null
curl -fsS http://localhost:3000/dashboard >/dev/null
```

## Production Deployment Steps

1. Confirm explicit production approval names commit `9f2aaa27c0ac75802235f3deee05881891fc969a`.
2. Confirm `master` is clean and points at the approved commit.
3. Run all pre-release checks.
4. Build immutable production images:

   ```bash
   export ENVIRONMENT_NAME=production
   scripts/cicd/prepare-ecr.sh
   scripts/cicd/build.sh
   export FORCE_SERVICE_REDEPLOY=true
   export SERVICE_REDEPLOY_TARGET=all
   scripts/cicd/build-go-services.sh
   ```

5. Record all image URIs and digests from `image.env`.
6. Review production Terraform plan before apply.
7. Validate service migration discovery uses service-local migration folders.
8. Deploy through the approved production path:

   ```bash
   export ENVIRONMENT_NAME=production
   export PRODUCTION_APPROVED=true
   export PRODUCTION_MIGRATION_APPROVED=true
   scripts/cicd/deploy-environment.sh
   ```

9. Record ECS task definition ARN, deployed image digests, migration output, and smoke-test output.

## Acceptance Criteria

- WHEN production deployment starts, THEN the source commit is `9f2aaa27c0ac75802235f3deee05881891fc969a`.
- WHEN service migrations run, THEN deployment scripts load migrations from `apps/backend_api/internal/services/<service>/migrations`.
- WHEN `https://rollfinders.com/api/health` is requested after deployment, THEN it returns healthy.
- WHEN `/` loads, THEN users can search public open mats and training sessions from the home page.
- WHEN default public discovery has infinite recurring courses, THEN no single recurring course floods the listing beyond the default visible cap.
- WHEN `/` has more than one page of visible results, THEN pagination shows the current page as `n of n pages` and page links preserve filters.
- WHEN `/open-mats` is requested, THEN it redirects to the home discovery experience without losing query filters.
- WHEN `/about` loads, THEN the restored London-focused RollFinders narrative is visible.
- WHEN the footer renders, THEN it includes `About`, `Contact`, `Privacy Policy`, and `Terms of Service`.
- WHEN `/dashboard`, `/dashboard/academies`, `/dashboard/users`, `/dashboard/courses`, `/dashboard/payment`, `/dashboard/bookings`, `/dashboard/academy-claims`, and `/dashboard/wallet` load for authorised users, THEN no server error occurs.
- WHEN production logs are reviewed for 15 minutes after release, THEN no repeated startup, migration, auth, booking, payment, or API gateway errors are present.

## Product Smoke Tests

- `/api/health`
- `/`
- `/?page=2`
- `/?when=today`
- `/?when=tomorrow`
- `/?when=weekend`
- `/about`
- `/academies`
- One academy profile with upcoming sessions if data exists
- One recurring event detail link with `?date=YYYY-MM-DD`
- `/dashboard`
- `/dashboard/academies`
- `/dashboard/users`
- `/dashboard/wallet`

## Regression / Compatibility Tests

- Confirm stored recurrence rules, recurrence limits, admin duplicate checks, payment occurrence lookup, and direct event detail `?date=` links still work.
- Confirm date-intent public searches are not constrained by the default recurrence display cap.
- Confirm the public home page and `/open-mats` route do not create duplicate discovery surfaces.
- Confirm migrated docs references do not point users to stale `docs/services/<service>` locations.
- Confirm deployment scripts do not reference removed root service migration folders.
- Confirm no service modifies another service's owned tables.

## Rollback Plan

- Method: redeploy the previous known-good ECS task definition and image set.
- Data rollback required: not expected; this release should not require destructive schema rollback.
- If the failure is only in public discovery UI, revert commit `9f2aaa2` and redeploy a new portal image.
- If the failure is migration-path related, stop deployment and restore the previous task definition; do not move or delete production migration state without a separate recovery ticket.
- If public health fails, keep or restore the previous production task rather than leaving production stopped.

Rollback steps:

1. Capture failing URL, health response, task definition ARN, image URI, migration logs, and CloudWatch errors.
2. Repoint the ECS service to the previous known-good task definition.
3. Wait for ECS service stability.
4. Re-run:

   ```bash
   curl -fsS https://rollfinders.com/api/health
   curl -fsS 'https://rollfinders.com/api/health?deep=1'
   ```

5. Record rollback evidence and final production status.

## Known Risks

- This commit contains a broad documentation and migration-folder refactor, so deployment script path checks are a hard gate.
- Full historical unit tests may include unrelated known failures; release approval must explicitly decide whether those block production.
- Public discovery now uses the home page as the main event page; stale user bookmarks to `/open-mats` must continue to redirect cleanly.
- Dashboard refactor was broad; route smoke checks are required before and after deployment.

## Out Of Scope

- Creating new infrastructure.
- Changing DNS, public certificates, load balancers, or production networking.
- Adding new product features beyond the committed release candidate.
- Data repair or manual production database edits.
- Deleting archived documentation.

