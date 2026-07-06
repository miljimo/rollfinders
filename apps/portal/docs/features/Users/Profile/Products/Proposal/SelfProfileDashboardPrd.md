# PRD: Self Profile Dashboard

## Implementation Metadata

- Feature area: Standard User Dashboard
- Suggested branch name: `feature/self-profile-dashboard`
- Status: Proposal
- Related component PRD: `apps/portal/docs/features/Users/Profile/Components/Proposal/UserProfile.md`

## Objective

Replace the current `My Profile` panel in `src/app/dashboard/page.tsx` with the new reusable `UserProfile` experience.

The self-profile dashboard SHALL let a signed-in user understand their identity, account status, role, academy context, and available self-service actions.

The self-profile dashboard SHALL be mobile-first and SHALL work as the canonical profile presentation for Standard Users while remaining compatible with the shared all-role `UserProfile` component.

## Current Source Reference

Current self-profile implementation:

* `src/app/dashboard/page.tsx` `UserProfilePanel`

Current behavior:

* shows `My Profile`
* shows initials
* shows name, active status, email, and role
* shows personal information
* shows account information
* shows academy information and `View Academy`
* links edit action to password change
* includes a hardcoded `Phone = Not provided` row

## Replacement Requirement

The new self-profile UI SHALL replace the current `My Profile` panel.

The current narrow centered card SHALL NOT remain as a parallel duplicate once the new reusable `UserProfile` UI is implemented.

Existing dashboard entry points that show `My Profile` SHALL show the new self-profile experience.

The surrounding dashboard content, including academy rolls and member/admin links, SHALL remain usable.

## Component Reuse Requirements

The implementation SHALL use the reusable `UserProfile` component.

The implementation SHALL reuse existing RollFinders components, including buttons, badges, page shell patterns, section headings, spacing, icon style, and link treatments wherever possible.

New self-profile-specific components SHALL only be introduced when the reusable `UserProfile` component cannot reasonably support the self-profile behavior.

## Ownership Heading Requirement

IF the authenticated user views their own profile

WHEN `UserProfile` renders

THEN the heading SHALL be `My Profile`.

AND the profile SHALL use the same `UserProfile` component used by admin-view profile surfaces.

## Required Self-Profile Fields

The self-profile SHALL show:

* avatar or initials
* display name
* email
* role
* account status
* current belt or rank when available
* practitioner verification status when available
* academy name or `No academy assigned`
* academy location when available
* coach or professor when available
* member-since date when available
* created date
* last login or `Never`

The profile SHALL NOT show placeholder fields such as phone unless the field is backed by real product data and editing behavior.

## Belt Journey Requirement

IF practitioner belt or graduation data exists for the authenticated user

WHEN the self-profile renders

THEN the profile SHOULD show a compact belt journey section.

AND the current belt SHALL be visually identifiable with visible text such as `Current`.

AND completed belts or graduations SHALL be shown only when backed by reliable source data.

AND missing belt history SHALL not produce fake milestones.

## Academy Events Requirement

IF the authenticated user belongs to an academy

WHEN current or upcoming events exist for that academy

THEN the self-profile SHOULD show a `Current Academy Events` section.

AND the events SHALL be scoped to the authenticated user's assigned academy.

AND the section SHALL NOT show events from other academies.

AND event controls SHALL be read-only unless the user's role has explicit permission to manage the event.

## Required Self-Profile Actions

The self-profile SHALL provide:

* change password
* view assigned academy when available
* contact admin or support for access changes where available

The self-profile SHALL NOT show admin-only actions such as edit another user, role changes, academy reassignment, enable or disable, delete user, audit trail, or password email for another user.

## Visual Requirements

The new self-profile UI SHALL move away from the current narrow centered card toward a richer, structured profile surface that still feels native to the dashboard.

The UI SHALL use:

* clear sections
* scannable labeled rows
* restrained styling
* consistent badge treatment
* efficient action placement

The mobile layout SHALL prioritize the identity header, academy context, primary actions, belt journey, and current academy events before lower-priority account metadata.

Desktop layouts MAY use additional columns, but the mobile order SHALL remain the baseline content hierarchy.

The UI SHALL preserve existing dashboard visual continuity.

## Regression Protection

The implementation SHALL preserve:

* profile open or display behavior
* close behavior when the profile is shown as a drawer, sheet, or dialog
* identity display
* status display
* email display
* role display
* personal/account/academy information
* academy profile navigation
* password-change access
* mobile usability

## Accessibility Requirements

IF the self-profile renders as a drawer, dialog, or sheet

WHEN it opens

THEN focus SHALL move into the profile surface and return to the opener when closed.

AND close, password, academy, and support actions SHALL be keyboard accessible.

AND role and status SHALL be communicated through visible text, not only color.

AND long names, emails, and academy names SHALL wrap or truncate safely without overlapping actions.

## Acceptance Criteria

* The current `/dashboard` `My Profile` panel is replaced by the new reusable `UserProfile` UI.
* Current self-profile fields remain available unless explicitly excluded.
* The hardcoded phone placeholder is removed unless real phone data exists.
* Existing dashboard content continues to render and behave normally.
* The self-profile uses reusable `UserProfile` component and existing RollFinders UI primitives.
* Mobile layout is usable and accessible.
