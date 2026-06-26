# PRD: Public Web, Auth Portal, and Dashboard Routing

## Objective

Separate the public RollFinders website from authentication and dashboard functionality.

The public website should focus on discovery and marketing. Authentication must be handled by a dedicated Auth Portal. Authenticated operational pages must be reached through the Dashboard Shell.

## Core Rule

```text
rollfinders.com = public access and dashboard shell
auth.rollfinders.com = login and authentication
dashboard.<service>.rollfinders.com = service-specific dashboards
```

## Domain Structure

### Public Website

```text
https://rollfinders.com
```

Purpose:

* Public homepage.
* Academy discovery.
* Event discovery.
* Open mat discovery.
* Map view.
* Public marketing pages.

Public website requirements:

* Public pages must remain accessible without authentication.
* Public pages must not call protected service enrichment endpoints unless they degrade gracefully.
* The public website main navigation must not contain a `Login` button.
* The public website may contain a `Dashboard` link.

### Authentication Portal

```text
https://auth.rollfinders.com
```

Purpose:

* Login.
* Logout.
* Forgot password.
* Reset password.
* Register.
* Email verification.
* Session management.

All authentication flows must be handled here. Dashboard modules and service dashboards must not implement their own login pages.

### Dashboard Shell

```text
https://rollfinders.com/dashboard
```

Purpose:

* Authenticated dashboard landing page.
* Links to all available service dashboards.
* User navigation.
* Service dashboard discovery.

After successful login, users should be redirected to:

```text
https://rollfinders.com/dashboard
```

## Service Dashboards

The Dashboard Shell should provide links to service dashboards:

```text
https://dashboard.users.rollfinders.com
https://dashboard.academies.rollfinders.com
https://dashboard.courses.rollfinders.com
https://dashboard.bookings.rollfinders.com
https://dashboard.payments.rollfinders.com
https://dashboard.analytics.rollfinders.com
https://dashboard.access-keys.rollfinders.com
```

Service dashboards are future deployment targets. In the current portal implementation they are represented by service-owned dashboard routes and folders.

## Login Flow

```text
User visits rollfinders.com
        ↓
User clicks Dashboard
        ↓
Redirect to auth.rollfinders.com/login
        ↓
User logs in
        ↓
Auth Portal validates credentials
        ↓
Token/session created
        ↓
Redirect to rollfinders.com/dashboard
        ↓
Dashboard Shell loads available dashboards
```

## Public Website Navigation

Remove:

```text
Login
```

Add:

```text
Dashboard
```

If the user is not authenticated, clicking `Dashboard` redirects to:

```text
https://auth.rollfinders.com/login?redirect=https://rollfinders.com/dashboard
```

If the user is authenticated, clicking `Dashboard` opens:

```text
https://rollfinders.com/dashboard
```

## Authentication Rule

Dashboard pages require authentication.

If a user visits:

```text
https://rollfinders.com/dashboard
```

without a valid session, redirect to:

```text
https://auth.rollfinders.com/login?redirect=https://rollfinders.com/dashboard
```

Local development keeps the same contract with localhost:

```text
http://localhost:3000/login?redirect=http://localhost:3000/dashboard
```

`callbackUrl` is supported only as a compatibility alias for existing NextAuth flows. New links and redirects should use `redirect`.

## Current Implementation

The current web application lives in:

```text
apps/portal
```

The current local public website, Auth Portal, and Dashboard Shell are served by the same Next.js app:

```text
http://localhost:3000
http://localhost:3000/login
http://localhost:3000/dashboard
```

Production auth redirects are controlled by:

```text
AUTH_PORTAL_ORIGIN=https://auth.rollfinders.com
```

When `AUTH_PORTAL_ORIGIN` is not configured, localhost keeps redirects on the same origin so development remains usable.

## Dashboard Routes

Canonical dashboard shell route:

```text
/dashboard
```

Current dashboard service routes:

```text
/dashboard/academies
/dashboard/courses
/dashboard/bookings
/dashboard/payment
/dashboard/users
/dashboard/analytics
/dashboard/academy-review
/dashboard/academy-claims
/dashboard?panel=settings
```

Service-route aliases:

```text
/dashboard/users
/dashboard/academies
/dashboard/courses
/dashboard/bookings
/dashboard/payment
/dashboard/analytics
/dashboard/academy-review
/dashboard/academy-claims
/dashboard/access-keys
/dashboard/settings
```

Legacy query-panel URLs such as `/dashboard?panel=academies`, `/dashboard?panel=open-mats`,
`/dashboard?panel=users`, `/dashboard?panel=analytics`, `/dashboard?panel=platform-admin-academies`,
and `/dashboard?panel=academy-claims` are compatibility redirects only. New links should use the direct
dashboard service routes.

In Phase 1 these routes redirect into the current dashboard shell. They are not independent deployed applications yet.

`/dashboard/courses` maps to the existing course/events panel:

```text
/dashboard/courses
```

`/dashboard?panel=courses` remains supported as a compatibility alias.

## Dashboard Architecture

The dashboard must evolve from the current single `apps/portal` implementation into service-owned frontend boundaries while keeping the portal buildable, runnable, and deployable.

The dashboard is mostly orchestrated by:

```text
apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx
```

This file currently mixes shell layout, navigation, service data loading, service-specific panels, dialogs, and action wiring. That is the main implementation risk this PRD addresses.

## Design Principles

* Public website and authenticated dashboard must remain clearly separated.
* The API gateway remains the frontend entry point for backend service access.
* Authentication remains centralized through the Auth Portal.
* Service dashboards should be owned by service folders before any independent deployment work.
* Shared UI, layout, auth, API client, and types should be extracted only when there is a real reuse point.
* Every migration phase must keep the portal buildable, runnable, and deployable.
* Remote micro-frontends are a future option, not the first implementation step.

## Non-Goals For Phase 1

Phase 1 will not:

* Split `apps/portal` into multiple deployed React apps.
* Introduce Module Federation.
* Introduce remote plugin loading.
* Fully deploy `auth.rollfinders.com` as a separate app.
* Fully deploy `dashboard.<service>.rollfinders.com` as separate apps.
* Replace Next.js with Vite.
* Move public discovery pages out of `apps/portal`.
* Change authentication provider or token format.

## Phase 1: Portal Boundary Cleanup

### Goal

Make the public/auth/dashboard boundary clear without changing deployment.

### Required Changes

* Remove `Login`, `Dashboard` from public main navigation.
* Redirect unauthenticated dashboard requests to the Auth Portal login URL with `redirect`.
* Keep localhost redirects working without a separate auth domain.
* Preserve existing dashboard shell and service-panel behavior.
* Keep service-route aliases working.

### Acceptance Criteria

* `npm run typecheck` passes.
* `npm run build` passes.
* `/` renders without authentication and does not show a `Login` nav item.
* `/dashboard` redirects unauthenticated users to login with a redirect target.
* `/dashboard` renders after login.
* `/dashboard/courses` renders the course/events dashboard after login.
* `/dashboard?panel=courses` remains supported as a compatibility alias.

## Phase 2: Service-Owned Dashboard Folders

### Goal

Reduce dashboard coupling without changing routes, deployment, or authentication.

### Required Changes

* Keep `/dashboard` as the authenticated dashboard shell.
* Keep existing query-driven panels while service route aliases mature.
* Move service-specific dashboard components into folders under `apps/portal/src/app/dashboard`.
* Keep cross-service shell/navigation components under dashboard shell/shared folders.
* Keep service modules importing shared components rather than duplicating UI.
* Avoid large behavior rewrites while moving files.

### Service Folder Ownership

```text
dashboard/academies
  academy tables
  academy dialogs
  academy dashboard controls

dashboard/users
  users overview
  roles
  permissions
  access keys
  MFA

dashboard/payments
  payment overview
  transactions
  refunds
  payouts
  payment settings

dashboard/bookings
  booking dashboard panels
  booking actions UI

dashboard/analytics
  founder analytics panels
  activity summaries

dashboard/settings
  profile settings
  password settings
  email operations settings
```

authentication/login

## Phase 3: Shared Packages

### Goal

Move reusable code out of app folders once stable boundaries are visible.

Candidate packages:

```text
packages/ui
packages/layout
packages/auth
packages/api-client
packages/types
packages/config
```

Only extract code when:

* It is used by at least two service dashboard modules.
* It has a stable interface.
* It does not import app-specific routes or server-only code accidentally.
* It can be tested independently.

## Phase 4: Static Dashboard Registry

### Goal

Create a registry abstraction without remote runtime loading.

Example:

```ts
export const dashboardRegistry = [
  {
    id: "users",
    label: "Users",
    route: "/dashboard/users",
    remoteRoute: "https://dashboard.users.rollfinders.com",
    permission: "user.dashboard.view",
    enabled: true,
  },
  {
    id: "courses",
    label: "Courses",
    route: "/dashboard/courses",
    remoteRoute: "https://dashboard.courses.rollfinders.com",
    permission: "course.dashboard.view",
    enabled: true,
  },
];
```

Acceptance criteria:

* Navigation is generated from the registry.
* Authorization checks use registry permission metadata where applicable.
* A disabled dashboard does not appear in navigation.
* Adding a dashboard module requires registry entry plus module implementation.

## Phase 5: Remote Dashboard Evaluation

### Goal

Evaluate whether service dashboards should become independently deployed applications.

This phase should only proceed if there is a real team or release-boundary need.

Required decisions before implementation:

* Runtime technology: Module Federation, import maps, iframe isolation, or separate hostnames.
* Remote manifest location and schema.
* Manifest signing or trust model.
* Content Security Policy.
* Shared dependency version strategy.
* Failure behavior when a remote dashboard is unavailable.
* Rollback process.
* Local development workflow.
* Cross-dashboard navigation contract.
* Observability and error reporting ownership.

## Authorization

Authentication proves identity. Authorization decides dashboard access.

Dashboard permissions must align with backend gateway resource names from:

```text
apps/backend_api/internal/core/routes/constants.go
```

Preferred naming style:

```text
user.dashboard.view
academy.dashboard.view
course.dashboard.view
booking.dashboard.view
payment.dashboard.view
analytics.dashboard.view
access_key.dashboard.view
```

If access is denied, the UI should show a controlled access-denied state, not a framework error overlay.

## Local Development

Current local URLs:

```text
http://localhost:3000
http://localhost:3000/authentication/login
http://localhost:3000/dashboard
http://localhost:3000/dashboard/users
http://localhost:3000/dashboard/academies
http://localhost:3000/dashboard/courses
http://localhost:3000/dashboard/bookings
http://localhost:3000/dashboard/payment
http://localhost:3000/dashboard/analytics
http://localhost:3000/dashboard/access-keys
http://localhost:3000/dashboard/settings
```

API gateway:

```text
http://localhost:3007
```

## Completion Criteria

This PRD is complete when:

* Public navigation no longer exposes `Login`.
* Dashboard access uses Auth Portal redirects with a preserved target.
* Local development remains usable without a separate auth domain.
* The portal still builds.
* The dashboard remains usable.
* Public pages remain usable.
* Service dashboard aliases remain ready for incremental migration.
