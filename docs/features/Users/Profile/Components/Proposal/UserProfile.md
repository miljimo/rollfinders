# PRD: UserProfile Component

## Implementation Metadata

- Feature area: Users / Profile
- Component name: `UserProfile`
- Suggested location: `src/components/UserProfile/UserProfile.tsx`
- Suggested branch name: `feature/reusable-user-profile-component`
- Status: Proposal

## Objective

Create one reusable `UserProfile` display component for RollFinders user identity, account status, role, academy assignment, joined date, last login, and profile actions.

The component SHALL support Standard Users, Academy Admins, Platform Admins, Super Admins, and legacy Admin users through caller-provided view model data and caller-rendered action slots.

The component SHALL be easy to place inside an embedded panel, pop dialog, drawer, or page layout.

## Current Source References

Existing profile-related UI:

* `src/app/dashboard/page.tsx` `UserProfilePanel`
* `src/app/admin/page.tsx` `ViewUserDialog`
* `src/app/admin/users/page.tsx`
* `src/app/admin/users/[id]/page.tsx`
* `src/app/admin/users/UserForm.tsx`

Existing profile PRDs:

* `docs/features/Users/Standard/Products/Completed/UserProfileRedesignPrd.md`
* `docs/features/Users/Profile/Products/Proposal/UserProfileExperienceStrategyPrd.md`
* `docs/features/Users/Profile/Products/Proposal/SelfProfileDashboardPrd.md`
* `docs/features/Users/Profile/Products/Proposal/AdminUserProfileWorkflowPrd.md`

Existing reusable component PRDs:

* `apps/portal/docs/features/SharedComponents/Button.md`
* `apps/portal/docs/features/SharedComponents/Badge.md`
* `apps/portal/docs/features/SharedComponents/PanelSurface.md`
* `apps/portal/docs/features/SharedComponents/PageHeader.md`

## Component Reuse Requirement

The implementation SHALL reuse existing RollFinders components, layout primitives, form controls, buttons, badges, panels, dialogs, typography styles, spacing patterns, and icon style wherever possible.

New profile-specific subcomponents SHALL only be introduced when existing components cannot reasonably support the required profile behavior or layout.

`UserProfile` SHALL be a composition component, not a new visual system.

## TypeScript Naming Requirements

TypeScript files, exported components, types, props, and view-model fields SHALL use RollFinders' TypeScript naming style.

Component files and exported React components SHALL use PascalCase.

Examples:

* `src/components/UserProfile/UserProfile.tsx`
* `UserProfile`
* `UserProfileViewModel`
* `UserProfileProps`

Object properties, props, helper arguments, and view-model fields SHALL use camelCase.

Examples:

* `viewerIsSubject`
* `displayName`
* `roleLabel`
* `statusLabel`
* `createdAtLabel`
* `lastLoginAtLabel`
* `primaryActions`
* `secondaryActions`
* `footerActions`

The implementation SHALL NOT use snake_case names in TypeScript files for component props, view models, local variables, or exported types.

Database or API fields that arrive as snake_case SHALL be mapped to camelCase before being passed into `UserProfile`.

## Heading Rule

`UserProfile` SHALL render `My Profile` when the displayed profile belongs to the current viewer.

`UserProfile` SHALL render `User Profile` when the displayed profile belongs to another user.

The caller MAY override the title only when a surrounding container already owns the heading.

```ts
const title = props.title ?? (user.viewerIsSubject ? "My Profile" : "User Profile");
```

## Component Boundary

`UserProfile` SHALL be display-only.

`UserProfile` SHALL NOT:

* fetch profile data
* own admin permission checks
* own mutation logic
* own dialog, drawer, or route state
* own server actions
* own edit/create form behavior
* import raw Prisma policy logic

Pages, routes, dialogs, drawers, and panels SHALL prepare data, enforce permissions, and pass allowed actions into `UserProfile`.

`src/app/admin/users/UserForm.tsx` SHALL remain the edit/create form boundary and SHALL NOT be merged into `UserProfile`.

## View Model Requirements

`UserProfile` SHALL receive normalized display data instead of raw Prisma records.

The view model SHALL include only fields needed for display.

Sensitive fields such as password hashes, auth provider payloads, raw tokens, reset tokens, and internal secrets SHALL never be passed to `UserProfile`.

Recommended view model:

```ts
export type UserProfileViewModel = {
  id: string;
  viewerIsSubject: boolean;
  displayName: string;
  email: string;
  initials: string;
  roleLabel: string;
  statusLabel: "Active" | "Disabled";
  disabled: boolean;
  createdAtLabel: string;
  lastLoginAtLabel: string;
  academy?: {
    id: string;
    name: string;
    locationLabel?: string;
    href?: string;
  } | null;
  practitioner?: {
    currentBeltLabel?: string;
    currentBeltColor?: string;
    verificationLabel?: string;
    coachLabel?: string;
    memberSinceLabel?: string;
    locationLabel?: string;
    beltJourney?: Array<{
      label: string;
      yearLabel?: string;
      status: "completed" | "current" | "upcoming";
    }>;
  };
  academyEvents?: Array<{
    id: string;
    title: string;
    dateLabel: string;
    locationLabel?: string;
    href?: string;
  }>;
  protectedLabel?: string;
};
```

View model normalization SHALL derive:

* `viewerIsSubject` from displayed user id and viewer id.
* `displayName` from name with email fallback.
* `initials` from one shared initials helper.
* `disabled` from `status === DISABLED` or `disabled === true`.
* `statusLabel` from normalized disabled state.
* `createdAtLabel` from formatted created date.
* `lastLoginAtLabel` from formatted last login or `Never`.
* `academy.locationLabel` from available academy city/postcode or equivalent display location.
* `practitioner.currentBeltLabel` and `practitioner.beltJourney` from trusted graduation or belt history data only.
* `academyEvents` from the displayed user's assigned academy only.

## Component Props

Recommended props:

```ts
export type UserProfileProps = {
  user: UserProfileViewModel;
  variant?: "embedded" | "dialog" | "drawer";
  density?: "comfortable" | "compact";
  showHeader?: boolean;
  title?: string;
  description?: string;
  primaryActions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  sections?: {
    personal?: boolean;
    account?: boolean;
    academy?: boolean;
    beltJourney?: boolean;
    academyEvents?: boolean;
    help?: boolean;
  };
  className?: string;
};
```

## Action Slot Requirements

`UserProfile` SHALL receive actions through slots.

The caller SHALL decide which actions are authorized before rendering them.

Recommended slots:

* `primaryActions` for common actions such as `Edit` or `Change Password`.
* `secondaryActions` for related navigation such as `View Academy`.
* `footerActions` for workflow or destructive actions such as password email, disable, enable, or delete.

Admin-only actions SHALL NOT render for Standard User self-profile contexts unless the caller explicitly provides them through an authorized flow.

## Layout Requirements

`UserProfile` SHALL support these variants:

* `embedded` for the dashboard profile panel.
* `dialog` for pop dialog or modal usage.
* `drawer` for future right-side panel usage.

The component SHALL NOT own the outer dialog, drawer, overlay, focus trap, route, or close behavior.

The surrounding container SHALL own:

* overlay
* close control
* focus trap
* drawer or modal positioning
* URL state
* route state

`UserProfile` SHALL render the profile content surface only.

The profile content SHALL be mobile-first. Small viewports SHALL use a compact vertical composition with the identity header, status/academy context, primary actions, belt journey, academy events, and information sections stacked in a single readable flow.

Desktop and larger dialog layouts MAY expand sections into multiple columns, but SHALL preserve the same content hierarchy and SHALL NOT require horizontal scrolling.

## Required Sections

The default profile SHALL include:

* Personal Information
* Account
* Academy when academy data is available or when a missing academy message is useful
* Belt Journey when practitioner belt data exists
* Current Academy Events when assigned-academy event data exists

The Help section MAY render for self-profile contexts when the caller provides support or contact action content.

Future Security and Activity sections SHALL NOT be added until source data, privacy rules, and authorization requirements are defined.

## Replacement Targets

The first implementation SHALL replace:

* `src/app/dashboard/page.tsx` `UserProfilePanel`
* `src/app/admin/page.tsx` `ViewUserDialog` inner profile content

The implementation SHOULD also clarify or improve:

* `src/app/admin/users/page.tsx` `View Profile` target behavior
* `src/app/admin/users/[id]/page.tsx` read-first profile behavior

`UserForm` SHALL remain separate and reusable for edit/create workflows.

## Visual Requirements

`UserProfile` SHALL feel native to the RollFinders dashboard:

* white or near-white surface
* subtle borders
* restrained teal/accent usage
* compact scannable labeled rows
* consistent badge treatment
* existing button treatment
* lucide-style icons where icons improve recognition
* modest radius matching existing dashboard components

The component SHALL NOT use marketing-style hero layouts, decorative gradients, nested decorative cards, or oversized empty spacing.

## Accessibility Requirements

Role and status SHALL be communicated through visible text, not color alone.

Icons SHALL be decorative unless they add meaning not otherwise available in text.

Long names, emails, and academy names SHALL wrap or truncate safely without overlapping actions.

When `UserProfile` is rendered inside a dialog or drawer, the surrounding container SHALL provide focus management and close behavior.

## Acceptance Criteria

* One `UserProfile` component can render both `My Profile` and `User Profile`.
* The heading is derived from `viewerIsSubject` by default.
* Dashboard self-profile and admin view-user profile use the same component.
* The component can render inside embedded panels, dialogs, and drawers.
* Admin-only actions are passed as slots by authorized callers.
* Edit/create behavior remains in existing `UserForm`.
* Raw user status fields are normalized before reaching the component.
* Existing RollFinders components are reused wherever practical.
