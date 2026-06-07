# PRD: Standard User Shared Dashboard Experience

Status: Proposal

## Objective

Standard users SHALL use the same unified `/dashboard` experience pattern as admin users, with limited privileges. They SHALL be able to view rolls for their assigned academy in read-only mode without gaining admin management access.

## Product Scope

This feature reuses the dashboard shell, side panel behavior, responsive layout, and table patterns for standard users.

It does not grant standard users admin permissions.

## User Experience Requirements

### Shared Dashboard Shell

IF a Standard User signs in

WHEN authentication redirects them after login

THEN the user SHALL land in a dashboard experience that visually follows the admin dashboard layout.

AND the route SHALL be `/dashboard`.

AND the dashboard SHALL use the shared side panel control pattern where practical.

AND desktop SHALL use the dashboard sidebar behavior.

AND mobile SHALL use the drawer behavior.

AND standard-user navigation SHALL only include standard-user features.

### Limited Navigation

IF a Standard User views the dashboard navigation

WHEN the menu is rendered

THEN the menu SHALL only show permitted standard-user destinations.

AND the menu SHALL NOT show platform administration, academy administration, user administration, email operations, academy claims, map settings, or system settings.

Recommended standard-user navigation:

* Dashboard
* My Academy Rolls
* Members
* Password / Account Settings
* Help & Support
* Logout

### Read-Only Academy Rolls

IF a Standard User belongs to an academy

WHEN they open the dashboard rolls view

THEN they SHALL see rolls associated only with their assigned academy.

AND the rolls SHALL be presented using the same table/card quality as the admin dashboard where appropriate.

AND the user SHALL be able to open a roll detail view.

AND every roll action SHALL be read-only.

AND create, edit, delete, duplicate, publish, unpublish, reminder, and admin-only actions SHALL NOT be visible.

### No Academy Assignment

IF a Standard User does not have an assigned academy

WHEN they open the dashboard

THEN the page SHALL show an empty state explaining that no academy is assigned.

AND no cross-academy roll data SHALL be returned.

AND no admin actions SHALL be visible.

## Authorization Requirements

### Academy Scope

IF a Standard User requests dashboard data

WHEN the backend queries academies, members, or rolls

THEN every query SHALL be scoped to the user's assigned academy.

AND data from other academies SHALL never be returned.

### Read-Only Enforcement

IF a Standard User attempts to call a write action or write API directly

WHEN the backend authorizes the request

THEN the request SHALL be rejected.

AND the response SHALL be HTTP 403 Forbidden or an equivalent server-side denial.

AND no database mutation SHALL occur.

### Unified Dashboard Route Protection

IF the implementation moves admin dashboard behavior to `/dashboard`

WHEN a Standard User accesses `/dashboard`

THEN route-level permission checks SHALL allow only explicitly approved standard-user read-only views.

AND every admin write path SHALL continue to require admin or academy-admin privileges.

AND `/admin` SHALL be treated as a legacy admin route during migration.

See also: `docs/features/Users/Shared/Products/UnifiedDashboardRoutePrd.md`.

## IF / WHEN / THEN Acceptance Criteria

### STD-SHARED-DASH-001: Login Redirect

IF a Standard User logs in successfully

WHEN the login flow completes

THEN the user SHALL be redirected to the standard dashboard.

AND the dashboard route SHALL be `/dashboard`.

AND the dashboard SHALL use the shared dashboard UI pattern.

### STD-SHARED-DASH-002: Read-Only Rolls

IF a Standard User opens My Academy Rolls

WHEN rolls are loaded

THEN only rolls for the user's academy SHALL be displayed.

AND all visible controls SHALL be read-only.

### STD-SHARED-DASH-003: Hidden Admin Features

IF a Standard User opens the dashboard

WHEN navigation and panels are rendered

THEN admin-only panels and controls SHALL not be rendered.

### STD-SHARED-DASH-004: Direct Write Attempt

IF a Standard User submits a direct request to create, edit, or delete a roll

WHEN the backend receives the request

THEN the backend SHALL reject the request.

AND the database SHALL remain unchanged.

### STD-SHARED-DASH-005: Responsive Behavior

IF a Standard User opens the dashboard on mobile

WHEN the viewport is small

THEN the dashboard navigation SHALL use the same mobile drawer behavior as the admin dashboard.

AND all visible roll data SHALL remain readable without horizontal overflow.

## Non-Goals

* Standard users do not manage academies.
* Standard users do not manage members.
* Standard users do not create or edit rolls.
* Standard users do not access platform admin, super admin, email operations, or claim-management features.

## Development Notes

* Prefer extracting reusable dashboard shell/table components from admin pages rather than duplicating large page files.
* Keep existing `/api/dashboard/rolls` as the read-only data source unless a stronger shared API boundary is introduced.
* Add tests proving standard users can view same-academy rolls and cannot access write actions.
* Add tests proving standard users cannot see admin navigation items.

## Done When

* Standard user dashboard visually aligns with admin dashboard patterns.
* Standard users can view academy rolls in read-only mode.
* Standard users cannot mutate rolls.
* Standard users cannot see or access admin-only panels.
* Existing admin, academy admin, platform admin, and super admin dashboard behavior is unchanged.
