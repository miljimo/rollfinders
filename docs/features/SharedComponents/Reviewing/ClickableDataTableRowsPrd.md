# PRD: Clickable Data Table Rows

Version: 1.0

Status: Reviewing

Priority: High

Review date: 2026-06-13

Implementation evidence: shared table components exist, and many rows already expose a detail action or title link. The full-row click behavior still needs a reusable, accessible table API and adoption across operational tables.

Branch:

`feature/clickable-data-table-rows`

---

# Objective

Make data table rows clickable so operators can open the profile or detail page for the row's entity without hunting for a small title link or action menu.

The behavior must preserve existing row action menus, buttons, pagination, and keyboard accessibility.

---

# User Story

As an admin, I want to click anywhere on a table row to open the relevant record so that I can navigate quickly through academies, courses, open mats, users, claims, and other operational data.

---

# Scope

In scope:

* Shared table row navigation support.
* Desktop table rows.
* Mobile table cards.
* Admin and dashboard tables that represent entities with detail/profile routes.
* Clear destination mapping by entity type.
* Action controls that remain independently clickable.

Out of scope:

* Changing record authorization.
* Adding new detail pages where none exist.
* Replacing action menus.
* Changing public search result cards.

---

# Destination Rules

Rows SHALL navigate to the profile or detail page for their data:

* Academy rows navigate to academy admin detail or public academy profile according to table context.
* Course rows navigate to course detail.
* Open Mat rows navigate to open mat detail.
* User rows navigate to user detail where the actor has access.
* Claim rows navigate to claim detail.
* Analytics rows only become clickable if a meaningful detail route exists.

If no safe detail route exists, the row SHALL remain non-clickable.

---

# Requirements

## CTR-001: Shared Row Navigation API

IF a table consumer provides a row destination

WHEN the table renders

THEN desktop rows and mobile cards SHALL be visibly and semantically clickable.

Done when:

* Table supports a `getRowHref` or equivalent API.
* Desktop rows include hover/focus affordance.
* Mobile cards expose the same navigation behavior.
* Rows without a destination do not appear clickable.

## CTR-002: Preserve Actions

IF a row contains an action menu, button, or link

WHEN the user activates that control

THEN the control action SHALL run without also triggering row navigation.

Done when:

* Action links keep their own destination.
* Overflow menus remain usable.
* Keyboard users can reach row destination and action controls separately.

## CTR-003: Entity Destination Mapping

IF a table row represents an academy, course, open mat, user, or claim

WHEN the row is clicked

THEN the system SHALL open the correct detail/profile route for that entity.

Done when:

* Open Mat rows route to open mat details.
* Course rows route to course details.
* Academy rows route to academy profile/detail.
* User and claim rows route to existing admin detail pages when available.

## CTR-004: Accessibility

IF row click navigation is available

WHEN the table is used with keyboard or screen reader navigation

THEN the row destination SHALL be available through a real link target.

Done when:

* Implementation does not rely only on JavaScript `onClick`.
* Link text or aria label identifies the destination.
* Table markup remains valid.

## CTR-005: Visual Feedback

IF a row is clickable

WHEN the user hovers or focuses it

THEN the UI SHALL clearly show that the row can be opened.

Done when:

* Hover/focus treatment is consistent with existing table styling.
* Text does not overlap or shift layout.
* Existing status badges and action cells remain readable.

---

# Acceptance Criteria

* Clicking an Open Mat row opens that Open Mat's detail page.
* Clicking a Course row opens that Course's detail page.
* Clicking an Academy row opens that academy's profile/detail page.
* Clicking row action controls does not also activate the row destination.
* Mobile table cards provide the same destination as desktop table rows.
* Tables without a destination remain unchanged.
* Tests or contracts cover the shared table row destination API and at least one dashboard table adoption.
