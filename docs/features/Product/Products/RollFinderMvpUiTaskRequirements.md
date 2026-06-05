# PRD: MVP UI Task Requirements

Version: 1.0

Review date: 2026-06-05

Scope: UI-only task requirements extracted from the MVP gap, academy claiming, analytics, and admin onboarding PRDs.

---

# Current UI Reference

Current public UI:

* `/` home discovery page
* `/academies` academy directory
* `/academies/[slug]` academy profile
* `/open-mats` Open Mat Radar
* `/open-mats/[id]` open mat detail
* `/map` map page

Current admin UI:

* `/admin` admin dashboard
* `/admin/academies` academy management
* `/admin/academies/[id]` academy detail/edit
* `/admin/open-mats` open mat management
* `/admin/users` user management
* `/admin/users/CreateUserForm.tsx` admin create-user form

UI implementation must preserve the current page flows unless a requirement explicitly says otherwise.

---

# Branches

Use these branches for implementation:

* Academy claiming UI: `feature/mvp-academy-claiming-flow`
* Analytics UI instrumentation: `feature/mvp-analytics-success-metrics`
* Data-driven map UI: `feature/mvp-data-driven-map`
* Open mat contact UI: `feature/open-mat-contact-info`
* Admin-created user onboarding UI: `feature/admin-created-user-onboarding-email`

---

# Group 1: Academy Claiming UI

Source PRD:

`docs/features/Academies/Products/RollFinderAcademyClaimingPrd.md`

## UI-CLAIM-001: Claim Profile Action

IF a public user views `/academies/[slug]`

WHEN the academy profile renders

THEN the UI SHALL show a "Claim Profile" action without removing or obscuring academy details, directions, or upcoming open mats.

## UI-CLAIM-002: Claim Form Entry

IF the user selects "Claim Profile"

WHEN the action is activated

THEN the UI SHALL open a claim form or claim page with the current academy preselected.

## UI-CLAIM-003: Claim Form Fields

IF the claim form renders

WHEN the user reviews the form

THEN the UI SHALL provide fields for requester name, requester email, academy, and verification notes or evidence.

## UI-CLAIM-004: Claim Form Validation Display

IF the user submits an invalid claim form

WHEN the backend or server action returns validation errors

THEN the UI SHALL show clear field-level or form-level validation feedback.

## UI-CLAIM-005: Claim Submission Confirmation

IF a claim request is created successfully

WHEN the user returns from submission

THEN the UI SHALL show confirmation that the claim is awaiting admin review.

## UI-CLAIM-006: Admin Claim Navigation

IF an authorized admin opens `/admin`

WHEN claim management is available

THEN the UI SHALL expose a route or navigation item for reviewing academy claims without replacing existing admin cards.

## UI-CLAIM-007: Admin Claim List

IF an authorized admin opens claim management

WHEN claim requests exist

THEN the UI SHALL show a claim list with academy name, requester name, requester email, submitted date, and status.

## UI-CLAIM-008: Admin Claim Status Filter

IF an authorized admin views the claim list

WHEN status filters are available

THEN the UI SHALL allow filtering claims by pending, approved, rejected, or all statuses.

## UI-CLAIM-009: Admin Claim Detail

IF an authorized admin opens a claim

WHEN the claim detail renders

THEN the UI SHALL show academy details, requester details, verification notes/evidence, current status, and submitted date.

## UI-CLAIM-010: Approve And Reject Controls

IF an authorized admin views a pending claim

WHEN the claim detail renders

THEN the UI SHALL show approve and reject actions.

## UI-CLAIM-011: Rejection Reason Input

IF an admin chooses to reject a pending claim

WHEN rejection reason capture is supported by the API

THEN the UI SHALL allow the admin to enter a rejection reason.

## UI-CLAIM-012: Claim Decision Feedback

IF an admin approves or rejects a claim

WHEN the server action completes

THEN the UI SHALL show updated claim status or return to a refreshed claim list.

---

# Group 2: Analytics UI Instrumentation

Source PRD:

`docs/features/Product/Products/RollFinderMvpAnalyticsIfWhenThenRequirements.md`

## UI-ANALYTICS-001: Page View Tracking Hook

IF a public page renders successfully

WHEN analytics is enabled

THEN the UI SHALL trigger page view tracking without changing visible page content.

## UI-ANALYTICS-002: Academy Search Tracking

IF a user submits the `/academies` search form

WHEN the search action is accepted

THEN the UI SHALL trigger `academy_search_submitted` with safe metadata only.

## UI-ANALYTICS-003: Open Mat Search Tracking

IF a user submits the `/open-mats` search or filter form

WHEN the search/filter action is accepted

THEN the UI SHALL trigger `open_mat_search_submitted` with safe metadata only.

## UI-ANALYTICS-004: Academy Profile View Tracking

IF `/academies/[slug]` renders successfully

WHEN analytics is enabled

THEN the UI SHALL trigger `academy_profile_viewed`.

## UI-ANALYTICS-005: Open Mat Detail View Tracking

IF `/open-mats/[id]` renders successfully

WHEN analytics is enabled

THEN the UI SHALL trigger `open_mat_detail_viewed`.

## UI-ANALYTICS-006: Directions Click Tracking

IF a user clicks a directions link

WHEN navigation to the map provider begins

THEN the UI SHALL trigger `directions_clicked` and SHALL NOT block external navigation.

## UI-ANALYTICS-007: Map View Tracking

IF `/map` renders successfully

WHEN analytics is enabled

THEN the UI SHALL trigger `map_viewed`.

## UI-ANALYTICS-008: Map Marker Click Tracking

IF data-driven map markers exist

WHEN a user clicks a marker

THEN the UI SHALL trigger `map_marker_clicked`.

## UI-ANALYTICS-009: Claim Funnel Tracking

IF academy claiming UI exists

WHEN the user starts or submits a claim

THEN the UI SHALL trigger `claim_profile_started` and `claim_profile_submitted` at the appropriate steps.

## UI-ANALYTICS-010: Analytics Failure UX

IF analytics fails or is disabled

WHEN a user searches, views pages, clicks directions, opens the map, or submits a claim

THEN the UI SHALL continue the user flow without showing a public analytics error.

---

# Group 3: Data-Driven Map UI

Source PRD:

`docs/features/Product/Products/RollFinderMissingMvpRequirementsPrd.md` MR-002

## UI-MAP-001: Academy Marker Rendering

IF `/map` renders

WHEN academy records include latitude and longitude

THEN the UI SHALL display RollFinder academy markers from application data.

## UI-MAP-002: Open Mat Marker State

IF an academy has upcoming active open mats

WHEN its map marker renders

THEN the UI SHALL expose upcoming open mat state in the marker or marker detail.

## UI-MAP-003: Marker Detail

IF a user selects a map marker

WHEN marker detail opens

THEN the UI SHALL show academy name, borough/postcode, upcoming open mat summary, "View details", and "Directions."

## UI-MAP-004: Sidebar Synchronization

IF the map displays academy/open mat data

WHEN the sidebar list renders

THEN the sidebar SHALL show the same academy/open mat set represented on the map.

## UI-MAP-005: Provider Missing Fallback

IF the map provider key is missing

WHEN `/map` renders

THEN the UI SHALL show a useful location list with directions links instead of a dead map.

## UI-MAP-006: Mobile Map Usability

IF a user views `/map` on mobile

WHEN the map and sidebar render

THEN the UI SHALL keep marker details, list items, and directions actions usable without overlap.

---

# Group 4: Open Mat Contact UI

Source PRD:

`docs/features/Product/Products/RollFinderMissingMvpRequirementsPrd.md` MR-004

## UI-CONTACT-001: Contact Section

IF a user views `/open-mats/[id]`

WHEN academy or event contact information exists

THEN the UI SHALL show contact email and/or phone on the open mat detail page.

## UI-CONTACT-002: Academy Contact Fallback

IF the open mat has no event-specific contact information

WHEN academy contact information exists

THEN the UI SHALL show academy email and/or phone as the contact fallback.

## UI-CONTACT-003: Missing Contact State

IF no event or academy contact information exists

WHEN the detail page renders

THEN the UI SHALL show a clear fallback such as "Check with academy" without breaking the page layout.

---

# Group 5: Admin-Created User Onboarding UI

Source PRD:

`docs/features/Users/Products/AdminCreatedUserOnboardingEmailPrd.md`

## UI-USEREMAIL-001: Preserve Create User Form

IF `/admin/users` renders for an authorized admin

WHEN the create-user form is displayed

THEN the UI SHALL preserve the existing name, email, temporary password, role, academy, and create action flow.

## UI-USEREMAIL-002: Credential Approach Copy

IF implementation chooses raw temporary passwords or first-login setup links

WHEN the create-user form renders

THEN the UI SHOULD make the selected onboarding behavior clear to the admin.

## UI-USEREMAIL-003: User Created And Email Queued Feedback

IF user creation and onboarding email queueing succeed

WHEN the admin returns to `/admin/users`

THEN the UI SHOULD show confirmation that the user was created and onboarding email was queued.

## UI-USEREMAIL-004: Email Queue Failure Feedback

IF user creation succeeds but onboarding email queueing fails

WHEN the admin returns to `/admin/users`

THEN the UI SHALL communicate that the user exists but the onboarding email was not queued.

## UI-USEREMAIL-005: Password Reset Action Preserved

IF onboarding email functionality is implemented

WHEN an admin views a user row

THEN the existing "Send Password Email" action SHALL remain available for permitted users.

---

# Group 6: Search Performance UI/Developer Feedback

Source PRD:

`docs/features/Product/Products/RollFinderMissingMvpRequirementsPrd.md` MR-005

## UI-PERF-001: Search Check Visibility

IF search performance checks are added

WHEN the checks fail locally or in CI

THEN the failure output SHOULD identify whether academy search or open mat search exceeded the 2 second target.

---

# Group 7: Platform Decision Docs UI Impact

Source PRD:

`docs/features/Product/Products/RollFinderMissingMvpRequirementsPrd.md` MR-006

## UI-DOCS-001: Auth Copy Consistency

IF product or technical docs mention authentication

WHEN docs are updated

THEN user-facing/admin-facing implementation notes SHALL identify NextAuth credentials as the current auth approach.

## UI-DOCS-002: Hosting Copy Consistency

IF product or technical docs mention hosting

WHEN docs are updated

THEN implementation notes SHALL identify AWS ECS/Terraform as the current hosting/deployment approach.
