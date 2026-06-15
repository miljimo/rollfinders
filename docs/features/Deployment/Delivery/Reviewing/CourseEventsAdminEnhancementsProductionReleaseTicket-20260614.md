# Release Ticket: Course/Events Admin Enhancements To Production

## Status

Deployed to production on 2026-06-14.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current local master commit at latest validation and deployment: `9a6e5ce Import payment service into monorepo`
* Feature commit: `351069a Add course event admin enhancements`
* Verification commit: `e486f81 Update release verification contracts`
* Source cleanup commit included in verified tree: `7c2e3c9 Clean up dashboard panel state handling`
* Release evidence commit included in verified tree: `0fe7bd0 Record release push blocker`
* Payment service import commit included in deployed tree: `9a6e5ce Import payment service into monorepo`
* Production URL: `https://rollfinders.com`
* Requested date: 2026-06-14
* Release owner request: Product owner request in Codex session

## Purpose

Promote the Course/Events admin enhancements and related dashboard fixes to production while preserving existing public discovery, academy, dashboard, analytics, user management, and email behavior.

This release includes:

* Course/Event clone flow from admin lists, edit dialogs, and dashboard action menus.
* Generic Course/Event wording across platform and academy admin surfaces.
* Course/Event action menu labels: View Course, Edit Course, Clone Course.
* Clickable table rows with row-level hover while keeping action controls separate.
* Dashboard dialogs for user and course/event details where admin context should remain visible.
* Public course/open-mat detail pages as full pages rather than admin overlay dialogs.
* Optional donation pricing with "Optional donation - suggested from ..." labels.
* Daily visits and currently logged-in user analytics.
* Mobile dashboard cleanup that hides stats and quick actions panels on mobile.
* Platform-admin academies panel serialization fix.
* Contract test updates for the shared table row navigation and environment helper usage.

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

Completed locally on 2026-06-14:

* `npm run typecheck` passed.
* `node --import tsx --test src/lib/__tests__/course-cloning.test.ts src/app/admin/__tests__/DashboardClickableRowsContract.test.ts src/lib/__tests__/analytics-contracts.test.ts src/components/__tests__/SidePanelControl.test.tsx src/app/admin/__tests__/SuperAdminPlatformAcademiesPanel.test.tsx src/lib/__tests__/courses.test.ts` passed: 26/26 tests.
* `npm run test` passed: 149/149 tests.
* `npm run lint` passed with warnings only.
* `npm run build` passed with Next.js 16.2.7.
* `npm run payments:test` passed after importing `/home/leo62/projects/payments` into `services/payments`.
* `docker compose --profile app up -d --build` completed successfully, including Next.js production build and Prisma migration deploy.
* Local Docker app is healthy at `http://localhost:3000/api/health`.
* Local migration logs report no pending migrations after applying `20260614100000_event_pricing_type`.

### Remote Push Status

`git push origin master` was attempted on 2026-06-14 after release ticket creation and initially failed because local Bitbucket SSH authentication was not available:

```text
git@bitbucket.org: Permission denied (publickey).
fatal: Could not read from remote repository.
```

Production deployment SHALL either wait for Bitbucket SSH access to be restored or record an approved direct local deployment override with the deployed commit SHA.

Production deployment used an approved direct local deployment override on 2026-06-14 because Bitbucket SSH remained unavailable locally. Deployed commit: `9a6e5ce Import payment service into monorepo`.

Remote traceability was completed on 2026-06-15 after loading the Bitbucket SSH key with `ssh-agent` and `ssh-add ~/.ssh/bitbucket_private`. `master` and tag `production-2026-06-14-01` were pushed to Bitbucket successfully.

### Local Docker State

* `rollfinder-app-1` is up and healthy on port `3000`.
* `rollfinder-db-1` is up and healthy on port `54322`.
* Local health check returned `{"status":"ok"}`.

## Risk Classification

* Database migrations: medium risk because this release adds `EventPricingType` and `events.pricing_type`.
* Course/Event form behavior: medium risk because Open Mat and Course creation share the updated form.
* Dashboard navigation/dialog behavior: medium risk because multiple admin tables now use row-level navigation.
* Analytics reporting: medium risk because the founder dashboard now includes daily visits and current logged-in user stats.
* Public detail routes: low to medium risk because course/open-mat detail pages changed from dialog rendering to page rendering.

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

THEN the migration task SHALL complete successfully before the ECS service is updated.

AND the operator SHALL confirm that `events.pricing_type` exists and existing academy, event, activity, user, analytics, and email tables remain available after migration.

### Smoke Checks

IF the production service stabilizes

WHEN post-deployment validation begins

THEN the operator SHALL complete these smoke checks:

* `/api/health` returns `ok`.
* `/api/health?deep=1` returns `ok` and database `ok`.
* `/` returns successfully.
* `/open-mats` returns successfully.
* `/courses` returns successfully.
* `/academies` returns successfully.
* `/login` returns successfully.
* Admin dashboard loads.
* `?panel=open-mats` shows `Courses/Events`.
* Course/Event action menu shows View Course, Edit Course, Clone Course.
* Clone Course opens a prefilled create form and does not reuse activity IDs.
* Users table row opens an overlapping user detail dialog instead of navigating to `/admin/users`.
* Course/Event dashboard row opens an overlapping admin detail dialog.
* Public course/open-mat card "View Details" opens the actual detail page.
* Optional donation pricing displays "Optional donation - suggested from ..." where applicable.
* Analytics dashboard shows daily visits and currently logged-in user stats.
* `?panel=platform-admin-academies` loads without server serialization errors.
* Mobile dashboard does not show Stats Board or Quick Actions panels.

## Rollback

IF production health checks fail, migrations fail, ECS cannot stabilize, or key public/admin pages fail to render

WHEN the failure is confirmed

THEN the operator SHALL stop promotion, capture failed task definition, image URI, image digest, release tag, migration logs, and application logs.

AND the operator SHALL roll production back to the last known healthy task definition and image.

AND this ticket SHALL be updated with rollback reason, user impact, and follow-up action.

## Validation Checklist

* [x] `master` pushed to `origin/master`.
* [x] `master` and `origin/master` alignment confirmed.
* [x] Release owner request recorded.
* [x] `npm run typecheck` passed.
* [x] Focused feature tests passed.
* [x] `npm run test` passed.
* [x] `npm run build` passed.
* [x] Local Docker health check passed.
* [x] Production release tag selected.
* [x] Production shallow and deep health checks pass before deployment.
* [x] Production migrations complete successfully.
* [x] ECS production service stabilizes.
* [x] Production shallow and deep health checks pass after deployment.
* [x] Public page smoke checks passed.
* [ ] Authenticated admin dashboard smoke checks passed.
* [ ] Analytics dashboard smoke check passed.
* [x] Rollback criteria reviewed before deployment.

## Tester Sub-Agent Report

Role: Tester sub-agent.

Scope verified:

* Course/Event cloning.
* Clickable rows and dashboard dialogs.
* Analytics daily visits and logged-in user reporting contracts.
* Optional/free/donation pricing labels.
* Sidebar Courses/Events wording.
* Platform-admin academies panel.
* Full unit contracts and production build.

Commands run:

```bash
git status --short && git log -1 --oneline
rg -n "Clone Course|View Course|Edit Course|Courses/Events|platform-admin-academies|coursePriceLabel|pricingType|DailyVisits|logged" src docs prisma -S
npm run typecheck
node --import tsx --test src/lib/__tests__/course-cloning.test.ts src/app/admin/__tests__/DashboardClickableRowsContract.test.ts src/lib/__tests__/analytics-contracts.test.ts src/components/__tests__/SidePanelControl.test.tsx src/app/admin/__tests__/SuperAdminPlatformAcademiesPanel.test.tsx src/lib/__tests__/courses.test.ts
npm run test
npm run build
docker compose --profile app ps
curl -fsS http://localhost:3000/api/health
```

Pass/fail summary:

* Targeted feature tests: pass, 26/26.
* Full unit suite: pass, 149/149.
* Typecheck: pass.
* Lint: pass with warnings only.
* Production build: pass.
* Local Docker health: pass.
* Local migration deploy: pass.

Findings:

* Initial full test run exposed stale source-contract assertions. The developer sub-agent updated the assertions to match the current shared `Table.getRowHref`, `LinkedTableCell`, and `getEnvVariable` implementation. Re-run passed.
* `README.md` has unrelated local production deployment notes and was intentionally left out of this release ticket commit.

Remaining risks:

* Authenticated browser smoke checks were not automated in this session.
* Production deployment depends on valid AWS credentials being sourced from `.env`.
* Remote push may still depend on local Bitbucket SSH authentication.

## Developer Sub-Agent Report

Role: Developer sub-agent.

Actions:

* Confirmed latest feature implementation is committed on `master` as `351069a`.
* Updated stale verification contracts only, committed as `e486f81`.
* Committed the small dashboard cleanup/hydration source changes that were present in the verified working tree as `7c2e3c9`.
* Confirmed release validation candidate was `0fe7bd0`; production deployment included later payment service import commit `9a6e5ce`.
* Confirmed local Docker service, migration task, production build, lint, unit tests, and health endpoint are healthy.
* Created this production release ticket with deployment, smoke, rollback, and evidence requirements.

## Deployment Notes

Record promotion evidence here:

* Approved by: Product owner request in Codex session.
* Approval time: 2026-06-14.
* Pushed remote commit: `3472fc0 Record course events production deployment` pushed to `origin/master` on 2026-06-15.
* Pushed release tag: `production-2026-06-14-01` pushed to Bitbucket on 2026-06-15.
* Direct deployment override: Approved in-session on 2026-06-14 because AWS credentials were available in `.env` and Bitbucket SSH was unavailable at deploy time.
* Deployed commit: `9a6e5ce Import payment service into monorepo`.
* Production image: `533235209034.dkr.ecr.eu-west-2.amazonaws.com/rollfinder/production/app:9a6e5ce`.
* Production image digest: `sha256:76b6ef71b57119ed5365d802a9c836789f1fa8d9f89947238b9b4b8c36d62f95`.
* Production release tag: `production-2026-06-14-01`.
* Production task definition: `arn:aws:ecs:eu-west-2:533235209034:task-definition/rollfinder-production:33`.
* Migration result: Production migration task completed successfully.
* Super admin task result: Completed successfully.
* Health check result: Pre-deploy and post-deploy shallow health returned `{"status":"ok"}`; deep health returned `{"status":"ok","database":"ok"}`.
* Public page smoke result: `/`, `/open-mats`, `/courses`, `/academies`, and `/login` each returned HTTP 200 after deployment.
* Admin smoke result: Not manually authenticated in browser during this deployment.
* Analytics smoke result: Not manually authenticated in browser during this deployment.
* ECS service result: `rollfinder-production/web` stabilized with desired `2`, running `2`, pending `0`, rollout `COMPLETED`.
* Promotion record: Written for `production`.
* Deployment lock: Released.
* Rollback decision: No rollback required.
