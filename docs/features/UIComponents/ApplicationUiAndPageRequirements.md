# PRD: Application UI Components And Page Behaviors

Version: 1.0

Review date: 2026-06-05

Purpose: Define small, taskable functional requirements for existing RollFinder UI components, layouts, and page behaviors beyond the reusable Table component.

Audience: Human engineers and AI coding agents.

Sizing rule: Each requirement should be independently implementable or verifiable. A human engineer should be able to complete a requirement group within 2 days; an AI agent should be able to pick a single requirement and implement it in a focused run.

---

# Source UI Reviewed

Shared components:

* `src/components/shell.tsx`
* `src/components/ui.tsx`
* `src/components/LocationSearchForm.tsx`
* `src/components/NavLink.tsx`
* `src/components/LogoutButton.tsx`
* `src/components/Table/*`

Public pages:

* `src/app/page.tsx`
* `src/app/academies/page.tsx`
* `src/app/academies/[slug]/page.tsx`
* `src/app/open-mats/page.tsx`
* `src/app/open-mats/[id]/page.tsx`
* `src/app/map/page.tsx`
* `src/app/about/page.tsx`
* `src/app/contact/page.tsx`
* `src/app/privacy-policy/page.tsx`
* `src/app/terms/page.tsx`

Admin/dashboard pages:

* `src/app/admin/page.tsx`
* `src/app/admin/academies/page.tsx`
* `src/app/admin/academies/[id]/page.tsx`
* `src/app/admin/open-mats/page.tsx`
* `src/app/admin/open-mats/[id]/page.tsx`
* `src/app/admin/users/page.tsx`
* `src/app/admin/users/CreateUserForm.tsx`
* `src/app/dashboard/page.tsx`
* `src/app/dashboard/members/page.tsx`
* `src/app/dashboard/password/page.tsx`

Auth pages:

* `src/app/login/page.tsx`
* `src/app/login/LoginForm.tsx`
* `src/app/reset-password/[token]/page.tsx`
* `src/app/reset-password/[token]/ResetPasswordForm.tsx`

---

# Branch

Use branch:

`docs/ui-component-page-requirements`

For implementation tickets derived from this PRD, use focused branches such as:

* `feature/ui-shell-navigation`
* `feature/ui-card-components`
* `feature/ui-search-filter-forms`
* `feature/ui-public-discovery-pages`
* `feature/ui-admin-dashboard-components`
* `feature/ui-auth-forms`

---

# Group 1: Shell, Header, Footer, Navigation

Likely files:

* `src/components/shell.tsx`
* `src/components/NavLink.tsx`
* `src/components/LogoutButton.tsx`

## UI-SHELL-001: Page Shell Composition

IF a page uses `PageShell`

WHEN the page renders

THEN the layout SHALL render site header, main content, and site footer in that order.

Done when:

* Main content remains inside `<main>`.
* Footer appears after page content.
* Page content does not render outside the shell.

---

## UI-SHELL-002: Static Page Shell Composition

IF a public static page uses `StaticPageShell`

WHEN the page renders

THEN the layout SHALL render static header, main content, and footer without requiring authentication.

Done when:

* Static pages work for logged-out users.
* Static header shows public navigation and login.
* Footer links remain visible.

---

## UI-SHELL-003: Brand Link

IF the header renders

WHEN the user views the brand area

THEN the UI SHALL show the RollFinders logo/name and link it to `/`.

Done when:

* Brand link is keyboard accessible.
* Logo image has decorative or appropriate alt behavior.
* Brand text does not overflow on mobile.

---

## UI-SHELL-004: Public Navigation

IF the desktop header renders

WHEN the user is logged out

THEN the UI SHALL show Home, Academies, Open Mats, Map, and Login navigation links.

Done when:

* Links use `NavLink`.
* Active page uses `aria-current="page"`.
* Navigation is hidden on small screens according to current layout.

---

## UI-SHELL-005: Authenticated Navigation

IF the desktop header renders for a logged-in user

WHEN the user's role is known

THEN the UI SHALL show Dashboard/Admin links according to role and a Logout button.

Done when:

* Standard users see Dashboard.
* Academy admins route to `/admin` as dashboard.
* Platform-level admins see Admin.
* Logout signs out and returns to `/`.

---

## UI-SHELL-006: Mobile Search Shortcut

IF the header renders on mobile

WHEN desktop navigation is hidden

THEN the UI SHALL show a compact icon link to academy search.

Done when:

* Icon button links to `/academies`.
* Button has an accessible label.
* Button has stable dimensions.

---

## UI-SHELL-007: Footer Business Links

IF any public or app page renders with the site footer

WHEN the footer is visible

THEN the UI SHALL show About, Contact, Privacy Policy, and Terms of Service links.

Done when:

* Links route to `/about`, `/contact`, `/privacy-policy`, and `/terms`.
* Footer remains responsive on mobile.

---

# Group 2: Card Components

Likely files:

* `src/components/ui.tsx`
* Pages that render `AcademyCard` or `EventCard`

## UI-CARD-001: Academy Card Summary

IF an `AcademyCard` renders

WHEN academy data is provided

THEN the card SHALL show academy name, location, description summary, training tags, and details link.

Done when:

* Name links to `/academies/[slug]`.
* Borough or city and postcode are visible.
* Description is visually constrained.
* Details action is visible.

---

## UI-CARD-002: Academy Card Verified State

IF an academy is verified

WHEN `AcademyCard` renders

THEN the card SHALL show a verified indicator.

Done when:

* Indicator has accessible label or text equivalent.
* Unverified academies do not show the indicator.

---

## UI-CARD-003: Academy Card Training Tags

IF academy capability fields are true

WHEN `AcademyCard` renders

THEN the card SHALL show relevant tags for gi, no-gi, beginner friendly, competition, and drop-in price.

Done when:

* False or missing values do not render misleading tags.
* Drop-in price is formatted consistently.

---

## UI-CARD-004: Academy Card Upcoming Events

IF an academy card receives upcoming events

WHEN the card renders

THEN the card SHALL show up to two event links.

Done when:

* Event link routes to `/open-mats/[id]`.
* Event date and start time are visible.
* Empty event list does not leave broken spacing.

---

## UI-CARD-005: Event Card Summary

IF an `EventCard` renders

WHEN event and academy data are provided

THEN the card SHALL show gi type, event title, academy name, date, time, price, description summary, detail link, and directions link.

Done when:

* Event title links to `/open-mats/[id]`.
* Directions link opens map directions in a new tab.
* Price and date use shared formatters.

---

## UI-CARD-006: Distance Display

IF an academy or event has `distanceMiles`

WHEN the card renders

THEN the card SHALL display formatted distance.

Done when:

* Distance is hidden when missing.
* Distance formatting matches existing `formatDistanceMiles`.

---

# Group 3: Search And Filter Forms

Likely files:

* `src/components/LocationSearchForm.tsx`
* `src/components/ui.tsx`
* `src/app/academies/page.tsx`
* `src/app/open-mats/page.tsx`

## UI-SEARCH-001: Location Search Form Submission

IF `LocationSearchForm` renders

WHEN a user submits a query

THEN the form SHALL submit `q`, `lat`, and `lng` fields to the configured action.

Done when:

* `action` prop controls destination.
* Existing query value can be prefilled.
* Hidden latitude/longitude fields are present.

---

## UI-SEARCH-002: Use Current Location

IF geolocation is available

WHEN the user activates the location button

THEN the form SHALL request location and update the current URL with `lat` and `lng`.

Done when:

* Button has locating and enabled labels/tooltips.
* Location request failure does not break the form.
* Button is disabled while locating.

---

## UI-SEARCH-003: Auto Locate

IF `autoLocate` is enabled and no location params exist

WHEN `LocationSearchForm` hydrates

THEN the form MAY request current location once.

Done when:

* Auto-locate does not repeatedly prompt on every render.
* Existing `lat` and `lng` prevent auto prompt.

---

## UI-SEARCH-004: Open Mat Filter Form

IF `OpenMatLocationFilterForm` renders

WHEN the user submits filters

THEN the form SHALL submit query, when filter, gi filter, lat, and lng to `/open-mats`.

Done when:

* `when` supports any upcoming, today, tomorrow, and weekend.
* `gi` supports any style, gi, and no-gi.
* Form remains usable on mobile.

---

## UI-SEARCH-005: Basic Search Form

IF `SearchForm` renders

WHEN action, query, and placeholder props are provided

THEN the form SHALL render a query input and search button using the provided action.

Done when:

* Form does not hardcode placeholder or action.
* Input name is `q`.

---

# Group 4: Public Discovery Pages

Likely files:

* `src/app/page.tsx`
* `src/app/academies/page.tsx`
* `src/app/academies/[slug]/page.tsx`
* `src/app/open-mats/page.tsx`
* `src/app/open-mats/[id]/page.tsx`
* `src/app/map/page.tsx`

## UI-PAGE-001: Home Discovery Page

IF the home page renders

WHEN featured academies and events are available

THEN the page SHALL show hero search, differentiators, featured open mats, featured academies, and a final open mat CTA.

Done when:

* Hero search routes to `/open-mats`.
* Featured open mats use `EventCard`.
* Featured academies use `AcademyCard`.
* Page remains responsive.

---

## UI-PAGE-002: Academy Directory Page

IF `/academies` renders

WHEN search results are returned

THEN the page SHALL show heading, descriptive copy, location search, result count, and academy card grid.

Done when:

* Search query is preserved in the input.
* Result count reflects returned academies.
* Empty result state is clear if no academies are returned.

---

## UI-PAGE-003: Academy Profile Page

IF `/academies/[slug]` renders

WHEN academy data exists

THEN the page SHALL show academy name, status/affiliation label, description, profile details, tags, upcoming open mats, and map/directions panel.

Done when:

* Missing academy returns not found.
* Email, phone, website, borough, and drop-in fallback labels are clear.
* Upcoming open mats use `EventCard`.
* Directions action is accessible.

---

## UI-PAGE-004: Open Mat Radar Page

IF `/open-mats` renders

WHEN events and radar counts are available

THEN the page SHALL show filter form, today/tomorrow/weekend count links, result summary, event cards, and empty state.

Done when:

* Count links preserve location params when available.
* Event cards are chronological according to backend data.
* Empty state renders only when no events match.

---

## UI-PAGE-005: Open Mat Detail Page

IF `/open-mats/[id]` renders

WHEN event data exists

THEN the page SHALL show gi type, title, academy name, date, time, cost, capacity, location, description, directions, and academy details action.

Done when:

* Missing event returns not found.
* Directions link uses full address.
* Academy details action links to academy website or public academy profile.

---

## UI-PAGE-006: Map Page

IF `/map` renders

WHEN map data is available

THEN the page SHALL show map area and academy/open mat list with links to academy profiles.

Done when:

* Google key missing state is clear.
* Sidebar list remains scrollable.
* Upcoming event summary appears when available.

---

# Group 5: Admin Dashboard And Module Components

Likely files:

* `src/app/admin/page.tsx`
* `src/app/admin/academies/page.tsx`
* `src/app/admin/open-mats/page.tsx`
* `src/app/admin/users/page.tsx`

## UI-ADMIN-001: Admin Dashboard Header

IF `/admin` renders for an authorized admin

WHEN the admin role is known

THEN the page SHALL show role-appropriate heading, description, and module links.

Done when:

* The sidebar RollFinders logo/name links to `/`.
* Academy admins see academy-scoped copy.
* Platform/super admins see platform copy.
* Module links route to academies, open mats, users, and settings where allowed.

---

## UI-ADMIN-002: Metric Cards

IF admin metrics are available

WHEN `/admin` renders

THEN the page SHALL show metric cards for academy/open mat/user operational counts.

Done when:

* Values are formatted as localized numbers.
* Labels change appropriately for academy admin scope.

---

## UI-ADMIN-003: Admin Profile Card

IF admin profile data is available

WHEN `/admin` renders

THEN the page SHALL show profile initials, name, email, registered date, academy, role, and change password action.

Done when:

* Long names/emails wrap safely.
* Change password links to `/dashboard/password`.

---

## UI-ADMIN-004: Admin Module Card

IF an admin module is available

WHEN the dashboard module grid renders

THEN the UI SHALL show module title, description, action text, and link.

Done when:

* Cards do not nest other cards.
* Only permitted modules render for the current role.

---

## UI-ADMIN-005: Admin Panel Rows

IF admin panel data is available

WHEN academy or open mat panel renders

THEN the panel SHALL show clickable rows with primary and secondary text plus pagination.

Done when:

* Rows link to admin detail pages.
* Empty or small datasets do not break pagination.

---

# Group 6: Admin Management Forms

Likely files:

* `src/app/admin/academies/form.tsx`
* `src/app/admin/open-mats/form.tsx`
* `src/app/admin/users/CreateUserForm.tsx`
* `src/app/admin/users/page.tsx`
* `src/app/admin/settings/PasswordForm.tsx`

## UI-FORM-001: Create User Form

IF an authorized admin can create users

WHEN `/admin/users` renders

THEN the page SHALL show create-user fields for name, email, temporary password, role, academy assignment when required, and create action.

Done when:

* Academy assignment is required for standard and academy admin users when applicable.
* Academy assignment uses the reusable `AutoCompleteTextField` component for large academy lists.
* Platform admin option only appears for super admins.
* Academy admins cannot assign users outside their academy.

---

## UI-FORM-002: Inline User Edit Form

IF a user row is manageable by the current admin

WHEN `/admin/users` table renders

THEN the row SHALL show editable name, email, role, status, academy assignment, and save action.

Done when:

* Read-only rows show name/email only.
* Protected users show protected state.
* Inputs remain usable in horizontally scrollable table.

---

## UI-FORM-003: User Row Actions

IF a user row is manageable

WHEN actions render

THEN the UI SHALL show permitted enable/disable, password email, and delete actions.

Done when:

* Delete does not render for current user or super/admin roles when prohibited.
* Read-only rows show read-only label.

---

## UI-FORM-004: Academy Form

IF academy create/edit form renders

WHEN academy fields are available

THEN the form SHALL support operational academy profile fields, verification state, featured state, media/social fields, and training attributes.

Done when:

* Required fields are visually present.
* Validation errors can be displayed.
* Submit action preserves existing admin flow.

---

## UI-FORM-005: Open Mat Form

IF open mat create/edit form renders

WHEN academy/event fields are available

THEN the form SHALL support academy, title, description, date, start time, end time, gi type, price, capacity, and active state.

Done when:

* Academy selection follows role scope.
* Time/date fields are usable on mobile.
* Active checkbox state is visible.

---

## UI-FORM-006: Change Password Form

IF change password page renders

WHEN the user enters a valid new password

THEN the UI SHALL submit the password change and show success or validation feedback.

Done when:

* Password inputs are not prefilled.
* Errors are visible.
* Success state is clear.

---

# Group 7: Auth And Account Forms

Likely files:

* `src/app/login/page.tsx`
* `src/app/login/LoginForm.tsx`
* `src/app/reset-password/[token]/page.tsx`
* `src/app/reset-password/[token]/ResetPasswordForm.tsx`

## UI-AUTH-001: Login Form

IF `/login` renders

WHEN the user is not authenticated

THEN the page SHALL show email, password, submit action, and error feedback.

Done when:

* Email input uses email type.
* Password input uses password type.
* Failed login can show feedback.
* Successful login redirects according to current auth behavior.

---

## UI-AUTH-002: Logout Button

IF a logged-in user sees the header

WHEN the user clicks Logout

THEN the button SHALL sign the user out and redirect to `/`.

Done when:

* Button remains keyboard accessible.
* Header updates after sign out.

---

## UI-AUTH-003: Reset Password Form

IF a valid reset token page renders

WHEN the user enters and submits a new password

THEN the UI SHALL submit the reset and show success or error feedback.

Done when:

* Invalid/expired token feedback is clear.
* Password input uses password type.
* Success flow identifies account email or next login action where available.

---

# Group 8: Static Business Pages

Likely files:

* `src/app/about/page.tsx`
* `src/app/contact/page.tsx`
* `src/app/privacy-policy/page.tsx`
* `src/app/terms/page.tsx`

## UI-STATIC-001: About Page

IF `/about` renders

WHEN a public user views the page

THEN the page SHALL explain what RollFinder is, why it exists, who it serves, and its BJJ community focus.

Done when:

* Page works without authentication.
* Metadata title/description are present.
* Content is mobile friendly.

---

## UI-STATIC-002: Contact Page

IF `/contact` renders

WHEN a public user views the page

THEN the page SHALL provide contact, support, and business enquiry routes.

Done when:

* Contact information is visible.
* Page works without authentication.

---

## UI-STATIC-003: Privacy Policy Page

IF `/privacy-policy` renders

WHEN a public user views the page

THEN the page SHALL explain account data, cookies, analytics, retention, and user rights.

Done when:

* Analytics language stays accurate when analytics provider is selected.
* Page works without authentication.

---

## UI-STATIC-004: Terms Page

IF `/terms` renders

WHEN a public user views the page

THEN the page SHALL explain platform usage rules, user responsibilities, academy responsibilities, content rules, and liability limits.

Done when:

* Page works without authentication.
* Footer links route to it.

---

# Group 9: Shared UI Quality Requirements

Likely files:

* All UI components and pages

## UI-QUALITY-001: Mobile Responsiveness

IF any public or admin page renders on mobile

WHEN viewport width is narrow

THEN text, buttons, forms, tables, and cards SHALL not overlap or overflow their containers.

Done when:

* Long names/emails wrap.
* Buttons maintain usable tap targets.
* Horizontal scrolling exists where wide tables are unavoidable.

---

## UI-QUALITY-002: Keyboard Accessibility

IF a page includes links, buttons, forms, or controls

WHEN the user navigates with keyboard

THEN all interactive controls SHALL be reachable and have visible focus behavior from browser/default or custom styles.

Done when:

* Icon-only actions have accessible labels.
* Form controls have labels or clear accessible names.

---

## UI-QUALITY-003: Empty States

IF a list/grid/table has no data

WHEN the page renders

THEN the UI SHALL show a clear empty state instead of a broken or blank layout.

Done when:

* Empty state text explains what is missing.
* Layout spacing remains stable.

---

## UI-QUALITY-004: Loading And Error Safety

IF client-side interactive controls are waiting for browser APIs or async actions

WHEN loading or errors occur

THEN the UI SHALL avoid duplicate actions and present clear disabled, fallback, or error behavior.

Done when:

* Geolocation button disables while locating.
* Form submissions do not require duplicate clicks.
* Missing optional data has fallbacks.

---

# Recommended Implementation Order

1. Shell/navigation/footer requirements.
2. Card component requirements.
3. Search/filter form requirements.
4. Public discovery page requirements.
5. Admin dashboard and management form requirements.
6. Auth/account form requirements.
7. Static business page requirements.
8. Shared UI quality pass.

---

# Global Acceptance Criteria

This PRD is complete when:

* Each reusable component has taskable behavior requirements.
* Each major page has taskable behavior requirements.
* Requirements are written in IF/WHEN/THEN format.
* Requirements preserve the existing visual system and layout patterns.
* Requirements are small enough to convert into engineering tickets.
* No requirement depends on a large multi-week redesign.
