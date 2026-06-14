# Release Ticket: Course/Events Admin Enhancements To Production

## Status

Ready for production approval. Not deployed by this ticket yet.

## Release Candidate

* Source branch: `master`
* Target environment: `production`
* Current local master commit at ticket creation: `7c2e3c9 Clean up dashboard panel state handling`
* Feature commit: `351069a Add course event admin enhancements`
* Verification commit: `e486f81 Update release verification contracts`
* Source cleanup commit included in verified tree: `7c2e3c9 Clean up dashboard panel state handling`
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
* `npm run build` passed with Next.js 16.2.7.
* Local Docker app is healthy at `http://localhost:3000/api/health`.

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

* [ ] `master` pushed to `origin/master`.
* [ ] `master` and `origin/master` alignment confirmed.
* [x] Release owner request recorded.
* [x] `npm run typecheck` passed.
* [x] Focused feature tests passed.
* [x] `npm run test` passed.
* [x] `npm run build` passed.
* [x] Local Docker health check passed.
* [ ] Production release tag selected.
* [ ] Production shallow and deep health checks pass before deployment.
* [ ] Production migrations complete successfully.
* [ ] ECS production service stabilizes.
* [ ] Production shallow and deep health checks pass after deployment.
* [ ] Public page smoke checks passed.
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
* Production build: pass.
* Local Docker health: pass.

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
* Confirmed local Docker service and health endpoint are healthy.
* Created this production release ticket with deployment, smoke, rollback, and evidence requirements.

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
