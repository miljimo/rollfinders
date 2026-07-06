# PRD: Unified Dashboard Route

Status: Proposal

## Objective

RollFinders SHALL use `/dashboard` as the generic authenticated dashboard route for all user roles.

The current `/admin` dashboard route SHALL be migrated behind the unified dashboard experience so that route names do not imply that every dashboard user is an admin.

## Product Decision

`/dashboard` is the canonical workspace route for:

* Super Admin
* Platform Admin
* Academy Admin / Academy Owner
* Standard User

Role and permission checks SHALL decide which navigation items, panels, data, and actions each user can access.

## Routing Requirements

### DASH-ROUTE-001: Canonical Dashboard Route

IF any authenticated user logs in

WHEN the login redirect is calculated

THEN the user SHALL be redirected to `/dashboard`.

AND `/dashboard` SHALL render the role-appropriate dashboard.

### DASH-ROUTE-002: Role-Based Dashboard Content

IF an authenticated user opens `/dashboard`

WHEN the server loads dashboard data

THEN the page SHALL evaluate the user's role.

AND Super Admin users SHALL see super-admin permitted panels.

AND Platform Admin users SHALL see platform-admin permitted panels.

AND Academy Admin / Academy Owner users SHALL see academy-admin permitted panels scoped to their academy.

AND Standard Users SHALL see standard-user permitted panels scoped to their academy.

### DASH-ROUTE-003: Standard User Read-Only Access

IF a Standard User opens `/dashboard`

WHEN dashboard content is rendered

THEN the user SHALL see only standard-user navigation and read-only academy data.

AND the user SHALL be able to view rolls within their academy.

AND the user SHALL NOT see create, edit, delete, publish, unpublish, reminder, user-management, platform-management, email-operations, or academy-claim controls.

Detailed Standard User dashboard navigation, rolls, profile, and settings requirements SHALL live in `apps/portal/docs/features/Users/Standard/Products/StandardUserSharedDashboardPrd.md`.

### DASH-ROUTE-004: Legacy Admin Route Compatibility

IF an authenticated admin user opens `/admin`

WHEN the migration compatibility route is active

THEN the system SHOULD redirect the user to `/dashboard`.

AND existing bookmarks SHALL not break during the migration.

AND query-string panel state SHOULD be preserved where practical.

Example:

`/admin?panel=settings` SHOULD redirect to `/dashboard?panel=settings`.

### DASH-ROUTE-005: Legacy Admin Child Routes

IF an authenticated admin user opens an existing `/admin/...` child route

WHEN the child route has not yet been migrated

THEN the route MAY continue to work during the migration.

AND navigation links SHOULD move to `/dashboard/...` or `/dashboard?panel=...` as each feature is migrated.

AND write authorization SHALL remain unchanged.

### DASH-ROUTE-006: API Route Stability

IF code calls `/api/admin/...`

WHEN the dashboard UI route migrates to `/dashboard`

THEN API route names MAY remain unchanged until a separate API migration is approved.

AND API authorization SHALL remain role-based.

AND Standard Users SHALL NOT gain access to admin APIs because the UI route changed.

## Permission Requirements

### DASH-ROUTE-007: Route Name Does Not Grant Permission

IF a user can open `/dashboard`

WHEN server actions, API routes, or page loaders authorize the request

THEN permissions SHALL be evaluated by user role and academy scope.

AND the generic route name SHALL NOT grant extra access.

### DASH-ROUTE-008: Academy Scope

IF a user is assigned to an academy-limited role

WHEN dashboard data is queried

THEN the backend SHALL scope results to the assigned academy.

AND unrelated academy data SHALL not be returned.

## Development Requirements

### DASH-ROUTE-009: Shared Dashboard Shell

IF dashboard UI is rendered for any role

WHEN the page loads

THEN the implementation SHOULD use shared dashboard shell components.

AND role-specific panels SHOULD be composed inside that shell.

AND duplicated admin-only page structure SHOULD be reduced over time.

### DASH-ROUTE-010: Navigation Updates

IF dashboard navigation renders

WHEN links are generated

THEN the canonical dashboard links SHALL use `/dashboard`.

AND `/admin` links SHALL be treated as legacy links.

## Migration Plan

1. Update PRDs and route policy to make `/dashboard` canonical.
2. Move or wrap the current admin dashboard implementation so `/dashboard` can render role-based panels.
3. Redirect `/admin` to `/dashboard` for compatibility.
4. Migrate admin child pages and internal links incrementally.
5. Keep `/api/admin/...` stable until a separate API route migration is approved.
6. Add tests for login redirects, role-based navigation, and Standard User read-only access.

## Non-Goals

* This PRD does not rename admin API routes.
* This PRD does not grant Standard Users admin permissions.
* This PRD does not remove legacy `/admin` child routes in the first migration step.

## Done When

* Login sends all authenticated roles to `/dashboard`.
* `/dashboard` renders the correct panels for each role.
* Standard Users see academy-scoped read-only rolls.
* Admin users retain their existing working functionality under the unified dashboard route.
* `/admin` redirects or remains safely compatible during migration.
* Existing admin permission checks and write protections continue to pass.
