# Name: AUTH-20260715 - Redesign Login To Include Public Academy Registration

## Feature / Component

- Feature: Public academy onboarding
- Component: Portal login UI, authentication entry points, academy registration journey
- Priority: P1
- Branch: `master`
- Developer owner: Developer agent
- Test owner: Tester agent
- Dependencies: Existing user registration route, existing academy creation or claim flow
- Source PRD: `docs/features/Product/Products/Reviewing/PublicAcademyRegistrationLoginRedesignTicket-20260715.md`

## Goal

Redesign the login page so users can sign in, register a new academy or dojo, or create a user account from one clear public entry point.

## Scope

The agent must:

- Redesign the portal login page to match the supplied reference layout with RollFinders branding, welcome copy, email/password sign-in, remember-me control, forgot-password link, and two secondary onboarding cards.
- Add a clear `Register Your Academy` action for new academy or dojo owners who want to create and manage an academy profile, team, courses, and students.
- Add a clear `Create User Account` action for users whose academy already exists and who want to create an account, find their academy, and request to join.
- Route `Register Your Academy` to the approved public academy registration, academy creation, or academy claim journey.
- Route `Create User Account` to the approved public user registration journey.
- Preserve existing login behavior, validation, redirects, session handling, and error display.
- Ensure the page is responsive across mobile, tablet, and desktop without oversized controls or overlapping text.
- Use existing shared UI primitives, icons, typography, and form patterns where available.

The agent must not:

- Rebuild authentication, session, or password handling logic.
- Create a new academy domain model or duplicate existing academy creation APIs.
- Add payment, subscription, or wallet onboarding to this ticket.
- Add social login unless it already exists and is only being repositioned.
- Hard-code permissions or role checks in the UI.

## Implementation Notes

- The login page should remain a sign-in first experience, with academy and user registration presented as secondary actions below a visual divider.
- Suggested page copy:
  - Heading: `Welcome back`
  - Subheading: `Sign in to your academy account`
  - Academy card title: `Register Your Academy`
  - Academy card body: `Create a new academy profile and manage your team, courses, and students.`
  - User card title: `Create User Account`
  - User card body: `If your academy already exists, create your user account, find your academy, and request to join.`
- Use “academy or dojo” language where onboarding text needs to explain who should use academy registration, but keep primary button text short.
- The registration actions should be normal links or form-safe buttons so users can open them in a new tab and browser navigation works predictably.
- If the target registration routes do not exist, add route placeholders only if they follow existing routing patterns and clearly hand off to the current academy/user onboarding flow.
- The login page must not call backend APIs directly from shared UI components.

## Acceptance Criteria

- WHEN a visitor opens the login page, THEN they see RollFinders branding, sign-in controls, and clear registration choices for academy owners and users.
- WHEN a visitor selects `Register Academy`, THEN they are taken to the public academy or dojo registration journey.
- WHEN a visitor selects `Create User Account`, THEN they are taken to the public user account creation journey.
- WHEN an existing user signs in with valid credentials, THEN the existing post-login redirect behavior still works.
- WHEN sign-in fails, THEN the existing error state remains visible and understandable.
- WHEN the page is viewed on mobile, tablet, and desktop, THEN the form and registration cards fit without overlap, truncation, or horizontal scrolling.
- WHEN keyboard navigation is used, THEN fields, links, buttons, and password visibility controls are reachable in a logical order.

## Regression / Compatibility Tests

- Confirm existing login credential flow still authenticates users.
- Confirm `redirect` or callback URL behavior is preserved after login.
- Confirm forgot-password navigation still works if the route already exists.
- Confirm academy registration does not require an authenticated session before the user has created or claimed an academy.
- Confirm user registration does not create an academy automatically.
- Confirm no shared component performs direct backend requests.

## Out Of Scope

- Full academy onboarding form redesign.
- Academy verification workflow changes.
- User invite, join-request approval, or team-management workflow changes.
- Password reset implementation if it does not already exist.
- Authentication provider changes.
- Production deployment.
