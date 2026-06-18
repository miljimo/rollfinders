# PRD: User Profile Experience Strategy

## Implementation Metadata

- Feature area: User Profile
- Suggested branch name: `feature/user-profile-experience-strategy`
- Status: Proposal
- Current baseline PRD: `docs/features/Users/Standard/Products/Completed/UserProfileRedesignPrd.md`
- Reusable component PRD: `docs/features/Users/Profile/Components/Proposal/UserProfile.md`
- Current admin modal: `src/app/admin/page.tsx`
- Current self-profile panel: `src/app/dashboard/page.tsx`

## Objective

Define the next RollFinders user profile experience as a role-aware account and access hub.

The profile experience SHALL help users and admins understand identity, role, status, academy or platform context, and available actions without turning the product into a social profile or full account-settings product.

## Relationship To Existing Profile UI

The completed `Simple Admin User Profile` PRD remains the MVP baseline.

This PRD proposes the next iteration and SHALL supersede the MVP design direction when implemented.

The new profile experience SHALL replace the current `My Profile` panel rendered by `src/app/dashboard/page.tsx`.

The existing `My Profile` panel SHALL NOT remain as a parallel duplicate UI after the replacement is complete unless a temporary migration fallback is explicitly documented.

The admin user profile modal in `src/app/admin/page.tsx` SHALL be upgraded or replaced by the same profile design system, adapted for admin workflow needs.

The reusable `UserProfile` component SHALL be the shared display component for self-profile and admin-view profile surfaces.

The new profile experience SHALL apply to all authenticated user roles: Standard Users, Academy Admins, Platform Admins, Super Admins, and legacy Admin users. Role-specific data and actions MAY vary, but the visual profile system SHALL remain consistent.

## Product Principles

The profile SHALL be:

* Role-aware.
* Actionable.
* Mobile-first.
* Secure by default.
* Minimal by default.
* Clear about account scope and permissions.
* Consistent with existing RollFinders dashboard UI.

The profile SHALL NOT be:

* A public social profile.
* A gamified member profile.
* A billing or subscription hub.
* A deep analytics dashboard.
* A raw permission matrix.
* A place to expose internal database IDs, auth provider payloads, tokens, or secrets.

## Component Reuse Requirements

The implementation SHALL reuse existing RollFinders components, layout primitives, form controls, buttons, badges, panels, modals, typography styles, spacing patterns, and icon style wherever possible.

New components SHALL only be introduced when existing components cannot reasonably support the required profile behavior or layout.

Any new profile-specific components SHALL follow existing naming, styling, accessibility, and responsive patterns already present in the dashboard.

Existing reusable candidates include:

* `Button`
* `PageShell`
* `ActionMenu`
* Shared badge/status patterns documented in `docs/features/SharedComponents/Badge.md`
* Existing dialog, panel, table, and form styling patterns
* `UserForm` for edit/create workflows, not read-only profile display

## Reusable UserProfile Requirement

IF a profile surface is rendered

WHEN the profile belongs to the authenticated viewer

THEN the heading SHALL default to `My Profile`.

IF a profile surface is rendered

WHEN the profile belongs to another user

THEN the heading SHALL default to `User Profile`.

AND both cases SHALL use the same reusable `UserProfile` display component.

AND the component SHALL be embeddable in an embedded panel, pop dialog, drawer, or page layout.

AND the component SHALL receive normalized display data and caller-provided actions.

AND the component SHALL NOT own data loading, permission checks, route state, dialog state, mutation logic, or edit/create form behavior.

## Primary Outcomes

IF a user opens their own profile

WHEN the profile renders

THEN the user SHALL understand their identity, role, account status, academy context, and which fields are editable.

IF an admin opens another user's profile

WHEN the profile renders

THEN the admin SHALL understand the user's identity, access level, academy or platform context, account state, and available management actions.

IF sensitive or admin-only information exists

WHEN the profile renders

THEN the system SHALL show that information only to roles with a valid operational reason and server-side authorization.

## Core Profile Sections

The profile experience SHOULD support these sections:

* Identity: avatar or initials, full name, email, role, status.
* Access: role, academy or platform assignment, permission summary.
* Account: created date, last login, invitation or activation state where available.
* Academy context: assigned academy name, location, and public academy link where available.
* Academy events: current or upcoming events at the user's assigned academy where reliable event data exists.
* Belt journey: current belt or rank and graduation history where reliable practitioner data exists.
* Actions: role- and capability-aware profile actions.
* Security and activity: future-ready sections only when reliable data exists.

## Mobile-First Profile Requirements

The profile SHALL be designed mobile-first and then expanded for tablet and desktop layouts.

IF any authenticated user opens a profile on a small viewport

WHEN profile data renders

THEN the profile SHALL present a compact mobile-first identity header with avatar or initials, display name, current belt or role label where available, verification/status badge, assigned academy, coach or professor where available, member-since date, and location where available.

AND primary actions such as `Edit Profile`, `Change Password`, `View Academy`, or `Add Graduation` SHALL be visible without requiring table-style scanning.

AND profile sections SHALL stack vertically with stable spacing and no horizontal overflow.

AND long names, emails, academy names, and locations SHALL wrap or truncate safely without overlapping actions.

IF belt history exists

WHEN the profile renders

THEN the profile SHOULD show a compact belt journey strip that highlights the current belt and shows known previous or next belt milestones where available.

IF the user has an assigned academy

WHEN current or upcoming events exist for that academy

THEN the profile SHOULD show an academy events section scoped only to that academy.

AND the section SHALL NOT expose events from other academies.

AND event actions SHALL respect the viewer's role and permissions.

## Role-Specific Needs

Super Admin users need platform-wide identity and access context, permitted role management, academy assignment context, status controls, password email actions, and audit-aware destructive actions.

Platform Admin users need scoped identity and access context, permitted Academy Admin and Standard User management, academy assignment context, and no Super Admin-only controls.

Academy Admin users need same-academy identity and account context, same-academy user management where allowed, and no platform-wide metadata or controls.

Standard Users need their own identity, role, status, academy context, password/security access, and a clear route to request help for access changes.

## Replacement Requirements

IF the current `My Profile` panel is available in `/dashboard`

WHEN the new profile UI is implemented

THEN the new profile UI SHALL replace that panel's visual structure and behavior.

AND existing entry points that open or show `My Profile` SHALL open or show the new profile experience.

AND current self-profile information SHALL remain available unless explicitly removed by this PRD.

AND current dashboard surrounding content SHALL remain usable when the profile opens, closes, or renders on mobile.

## Regression Protection

The implementation SHALL preserve currently available profile information:

* user identity
* email
* role
* active or disabled status
* personal information
* account information
* academy information
* edit or password-change access where currently available
* close behavior where currently available

The implementation SHALL preserve current data sources and permission rules unless a follow-up implementation PRD explicitly changes them.

## Exclusions

This proposal SHALL NOT include:

* public bios
* follower/following concepts
* profile feeds
* academy popularity rankings
* billing details
* exports or downloads
* impersonation
* unrestricted role editing
* raw audit payloads
* raw authentication metadata

## Success Criteria

* Users can identify their current role, status, and academy context without support.
* Admins can understand user access and available actions faster than in the current modal.
* The existing `My Profile` panel is replaced by the new profile experience.
* The same reusable `UserProfile` component renders self-profile and admin-view profile surfaces.
* Existing profile data and actions do not regress.
* Sensitive profile data remains scoped by role and permission.
