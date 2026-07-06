# PRD: Admin User Profile Workflow

## Implementation Metadata

- Feature area: Admin User Management
- Suggested branch name: `feature/admin-user-profile-workflow`
- Status: Proposal
- Related component PRD: `apps/portal/docs/features/Users/Profile/Components/Proposal/UserProfile.md`

## Objective

Upgrade admin user profile viewing from a simple modal into a role-aware, read-first profile workflow that supports Super Admin, Platform Admin, and Academy Admin user-management needs.

The workflow SHALL reuse existing RollFinders components and current user-management actions wherever possible.

## Current Source References

Current admin profile and user-management surfaces:

* `src/app/admin/page.tsx` `ViewUserDialog`
* `src/app/admin/users/page.tsx`
* `src/app/admin/users/[id]/page.tsx`
* `src/app/admin/users/UserForm.tsx`
* `src/app/admin/users/actions.ts`

Current profile baseline:

* `apps/portal/docs/features/Users/Standard/Products/Completed/UserProfileRedesignPrd.md`

## Current Issues To Address

The current `/admin?panel=users` profile modal uses `ViewUserDialog` in `src/app/admin/page.tsx`.

The selected user is found from the current paginated users slice, so direct profile links can fail when the user is not on the current filtered page.

The dedicated `/admin/users/[id]` route is currently an edit page, not a read-first profile page.

The current admin profile modal does not consistently show email status, protected status, or a dedicated action section.

The current UI has repeated role/status/initials logic that SHOULD move toward reusable `UserProfile` component.

## Component Reuse Requirements

The implementation SHALL reuse:

* existing `UserForm` for edit/create workflows
* existing user-management server actions
* existing `Button` patterns
* existing badge/status styles or the shared `Badge` component when implemented
* existing dialog/drawer/panel styling patterns
* existing authorization helpers where applicable

The read-only admin profile surface SHALL use the reusable `UserProfile` component.

The implementation SHALL NOT create a second unrelated admin profile design system.

`UserProfile` SHALL receive admin actions through slots after the caller has enforced permissions.

`UserProfile` SHALL NOT decide whether the actor can edit, disable, enable, delete, or send password email.

## Workflow Requirements

IF an authorized admin opens a user profile from `/admin/users` or `/admin?panel=users`

WHEN the profile opens

THEN the system SHALL show a read-first profile surface for that user.

AND the surface SHALL use `UserProfile`.

AND the title SHALL be `My Profile` if the admin is viewing their own profile.

AND the title SHALL be `User Profile` if the admin is viewing another user.

AND the admin SHALL retain context to return to the user list.

AND the profile SHALL work when directly linked to a user id outside the current paginated table page.

AND edit actions SHALL be available only when the actor has manage permission.

AND read-only profile access SHALL be available when the actor has view permission but not manage permission.

## Required Admin Profile Fields

The admin profile SHALL show:

* display name
* email
* role
* account status
* email status
* academy name or `None`
* protected account indicator where authorized
* last login or `Never`
* created date

Future sections MAY include recent activity, invite state, MFA state, and admin notes only when source data and privacy rules are ready.

## Required Admin Actions

The profile SHALL show only actions the actor is allowed to perform:

* edit user
* send password email
* enable or disable user
* delete user where allowed
* copy email
* open related academy where available

The implementation SHALL reuse existing user-management actions unless a new action is explicitly required.

Destructive actions SHALL require confirmation and explain the operational impact.

## Authorization Requirements

Server-side authorization SHALL remain authoritative.

UI visibility SHALL NOT be treated as permission enforcement.

Super Admin users MAY view and manage users according to existing Super Admin business rules.

Platform Admin users SHALL NOT receive Super Admin-only or peer Platform Admin protected details.

Academy Admin users SHALL only view and manage users inside their assigned academy according to Academy Admin role requirements.

Self-delete and disallowed super-user actions SHALL remain blocked.

Protected user restrictions SHALL remain enforced.

## Route And Entry Point Requirements

The implementation SHOULD support a durable profile route or durable profile state for `/admin/users/[id]`.

The profile route SHOULD be read-first.

The edit form MAY be embedded as an edit mode or linked from the read-first profile, but it SHALL remain separate from the read-only profile display.

The `/admin?panel=users` dialog experience SHOULD use the same profile display primitives as `/admin/users/[id]`.

## Acceptance Criteria

* Admins can open a read-first user profile from admin user-management surfaces.
* Deep-linked profile access works outside the current table page.
* Read-only and manage permissions are separate.
* Existing user edit/create actions are reused.
* Email status and protected status are visible when authorized.
* Disallowed actions are hidden in the UI and blocked on the server.
* The profile uses reusable `UserProfile` component and existing RollFinders UI primitives.
* Admin actions are passed to `UserProfile` through caller-provided action slots.
