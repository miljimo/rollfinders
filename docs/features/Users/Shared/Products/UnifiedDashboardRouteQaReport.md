# QA Report: Unified Dashboard Route Migration

Date: 2026-06-07

Scope:

* `docs/features/Users/Shared/Products/UnifiedDashboardRoutePrd.md`
* `docs/features/Users/Standard/Products/StandardUserSharedDashboardPrd.md`
* `docs/features/Users/Standard/Products/StandardUserDashboardRoles.md`
* `docs/features/Users/Standard/Pages/DashboardPage.md`
* `docs/features/Users/Standard/APIs/DashboardRollsApi.md`

## Coverage Matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| `/dashboard` is canonical after login | `src/lib/__tests__/unified-dashboard-route-contracts.test.ts` checks `LoginForm` uses `/dashboard` callback and fallback URL. | Covered |
| `/admin` redirects to `/dashboard` and preserves query params | Contract test checks `src/app/admin/page.tsx` redirects to `/dashboard?${query}` and preserves array query params. | Covered |
| Admin roles continue under unified dashboard | Contract test checks `src/app/dashboard/page.tsx` renders `AdminDashboardWorkspace` for admin roles instead of redirecting to `/admin`. | Covered |
| Standard users get only allowlisted standard panels | Contract test checks `standardPanel` allowlist and invalid panel redirect to `/dashboard`. | Covered |
| Standard-user rolls are academy-scoped, newest-first, read-only | Contract test checks dashboard page and `/api/dashboard/rolls` source for academy scope, `createdAt desc`, read-only route shape, and no write handlers. | Covered |
| Standard users cannot access admin APIs | Contract test checks `isAnyAdminRole` excludes standard roles and `/api/admin/academies` uses `requireAdminApi`. | Partially covered |
| Admin/platform/super/academy behavior continues | Existing admin tests remain in `src/app/admin/__tests__`; new contract test checks unified workspace dispatch and canonical links. | Partially covered |

## Findings

1. `src/app/dashboard/AdminDashboardWorkspace.tsx` appears to drop pagination query strings.

   The `pageHref` helper currently contains `return query ? \`/dashboard?\` : "/dashboard";`, which preserves the route but not the generated query payload. This breaks panel/page state preservation for dashboard pagination links.

2. Admin child routes and server actions still contain many `/admin` links and redirect targets.

   This is allowed by `DASH-ROUTE-005` during migration, but it remains a follow-up gap for fully canonical navigation. Write authorization should remain unchanged while these routes are migrated.

3. Admin API denial coverage is currently source-contract level for one representative route.

   The test verifies shared guard use for `/api/admin/academies`, but direct route-handler tests for every admin API/action would provide stronger regression coverage.

## Recommended Follow-Up Tests

* Route-handler tests with mocked `getCurrentUser` for representative admin APIs returning HTTP 403 for `STANDARD_USER`.
* Rendering tests for Standard User dashboard output proving no admin navigation labels or write controls are present.
* E2E smoke for `/admin?panel=settings` redirecting to `/dashboard?panel=settings`.
* E2E smoke for `/dashboard?panel=settings` as Standard User redirecting back to `/dashboard`.
