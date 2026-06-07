# PRD: Dashboard Top Header Panel

## Component Name

`DashboardTopHeaderPanel`

## Objective

Create and preserve a shared dashboard top-header account control for all authenticated dashboard users.

The control SHALL use the compact initials-avatar plus chevron presentation in the top-right of the dashboard header.

The control SHALL keep the existing account popup menu behavior when clicked.

The behavior SHALL apply consistently to Standard User, Academy Admin, Platform Admin, legacy Admin, and Super Admin dashboard experiences.

---

## Scenario: Compact Account Trigger

IF an authenticated dashboard user opens a dashboard page

WHEN the top header renders

THEN the account trigger SHALL show only:

* circular initials avatar
* chevron indicator

AND the trigger SHALL NOT show the user's full name or role inline in the header.

AND the trigger SHALL remain right-aligned on desktop.

AND the trigger SHALL remain visible and tappable on mobile.

---

## Scenario: Account Popup Menu

IF the account trigger is clicked or tapped

WHEN the menu opens

THEN the menu SHALL show the user's account details.

AND the menu SHALL include:

* initials avatar
* display name or email fallback
* email address
* role label
* Settings link
* Logout action

AND the menu SHALL preserve the existing popup positioning, outside-click close behavior, and accessible menu semantics.

AND the trigger SHALL expose an accessible label equivalent to `Open account profile menu`.

---

## Scenario: Role Consistency

IF the authenticated dashboard user has any supported dashboard role

WHEN the dashboard top header renders

THEN the compact account trigger and popup menu SHALL behave consistently.

AND role-specific dashboard content SHALL remain unchanged.

AND the menu SHALL NOT expose unauthorized role-management actions.

---

## Scenario: Existing Functionality Preservation

IF dashboard navigation, side panels, settings, logout, or profile actions are already available

WHEN the top header account trigger is changed

THEN those existing workflows SHALL continue to work.

AND only the collapsed trigger presentation SHALL change.

AND the popup menu SHALL remain functional after the visual change.

---

## Acceptance Criteria

* All dashboard users see the compact initials-plus-chevron trigger.
* Clicking the trigger opens the existing account popup menu.
* The popup includes account details, Settings, and Logout.
* Standard and admin dashboard variants use the same behavior.
* Existing dashboard panels, settings routes, logout, and role scoping are unchanged.
* Automated checks cover that the trigger remains an account menu, not static markup.
