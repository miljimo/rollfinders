# PRD: RollFinder Missing MVP Requirements

Version: 1.1

Source PRD: `docs/features/Product/Products/Reviewing/RollFinderMvpPrd.md`

Review date: 2026-06-04

Scope: Gap index only. Detailed implementation requirements live in dedicated feature PRDs.

---

# Taskable Requirement Breakdowns

Use these grouped implementation docs when assigning work:

* UI tasks: `apps/portal/docs/features/Product/Products/RollFinderMvpUiTaskRequirements.md`
* API/backend tasks: `docs/features/Product/Products/RollFinderMvpApiTaskRequirements.md`

These files separate current UI requirements from API, server action, data model, authorization, analytics, email, and verification requirements.

---

# MVP Radar Assessment

The application is still on the MVP radar.

Current functionality broadly supports the core MVP goal: helping London BJJ practitioners find academies and open mats quickly. The remaining gaps are concentrated around academy claiming, analytics, map behavior, contact visibility, search performance validation, and documenting current platform decisions.

---

# Covered MVP Areas

## Academy Directory

Status: Mostly met

Evidence:

* `/academies` supports public academy browsing.
* Academy search covers name, city, borough, postcode, affiliation, gi/no-gi, beginner friendly, and competition terms.
* `/academies/[slug]` exposes public academy profile details.
* Academy profiles include directions/map links.

Remaining gap:

* Public profile needs a claim entry point, covered by MR-001.

---

## Open Mat Radar

Status: Mostly met

Evidence:

* `/open-mats` lists open mats chronologically.
* Today, tomorrow, and weekend filters exist.
* Open mat detail pages include academy, date, time, location, gi type, price, capacity, description, directions, and academy link.

Remaining gap:

* Contact information should be visible directly on open mat detail pages, covered by MR-004.

---

## Search

Status: Mostly met

Evidence:

* Academy and open mat search surfaces exist.
* Search supports location terms, academy terms, gi/no-gi, and competition terms.

Remaining gap:

* The 2 second search acceptance target is not verified, covered by MR-005.

---

## Map

Status: Partially met

Evidence:

* `/map` exists.
* Map page can render a Google Maps embed when configured.
* Map page lists academies beside the map.

Remaining gap:

* Map should render RollFinder academies/open mats as first-class data-driven markers, covered by MR-002.

---

## Academy Claiming

Status: Partially met

Evidence:

* `ClaimRequest` and `ClaimStatus` exist.
* Admin/academy membership models exist.

Remaining gap:

* End-to-end public claim intake and admin approval workflow are missing, covered by MR-001.

---

## Analytics

Status: Missing

Evidence:

* Privacy policy references analytics.
* Admin dashboard has operational counts.

Remaining gap:

* Product analytics for MVP traction metrics are missing, covered by MR-003.

---

# Missing Requirements Backlog

## MR-001: Complete Academy Claiming Flow

Priority: Critical

Implementation branch:

`feature/mvp-academy-claiming-flow`

Canonical PRD:

`apps/portal/docs/features/Users/Academies/Products/Completed/RollFinderAcademyClaimingPrd.md`

User story:

As an academy owner, I want to claim my academy profile so that I can keep academy and open mat information accurate.

Required outcomes:

* Public academy profile includes a "Claim Profile" action.
* Claim form captures requester name, email, academy, and verification notes/evidence.
* Submitted claims are stored with `PENDING` status.
* Admins can view, approve, and reject pending claims.
* Approved claim creates or links the requester user account.
* Approved owner receives academy access.
* Rejected owner receives notification.
* Claim actions are audit logged.

---

## MR-002: Data-Driven Interactive Map

Priority: High

Implementation branch:

`feature/mvp-data-driven-map`

User story:

As a practitioner, I want to see academies and open mats on a map so that I can choose a convenient place to train.

IF/WHEN/THEN requirements:

### MR-002.1: Academy Markers

IF the map page renders

WHEN academy records have latitude and longitude

THEN the system SHALL display academy markers from RollFinder data.

### MR-002.2: Open Mat Marker State

IF an academy has upcoming active open mats

WHEN the academy appears on the map

THEN the system SHALL expose upcoming open mat state in the marker or marker detail.

### MR-002.3: Marker Detail

IF a user selects a map marker

WHEN marker detail opens

THEN the system SHALL show academy name, borough/postcode, upcoming open mat summary, "View details", and "Directions."

### MR-002.4: Map Fallback

IF the map provider key is missing

WHEN the map page renders

THEN the system SHALL still show a useful location list with directions links.

---

## MR-003: Analytics For MVP Success Metrics

Priority: High

Implementation branch:

`feature/mvp-analytics-success-metrics`

Canonical PRD:

`docs/features/Product/Products/RollFinderMvpAnalyticsIfWhenThenRequirements.md`

User story:

As the founder, I want analytics for discovery behavior so that I can measure whether the MVP is reaching traction.

Required outcomes:

* Analytics provider is configured for production.
* Page views are tracked.
* Search submissions are tracked.
* Open mat and academy profile views are tracked.
* Direction clicks are tracked.
* Claim funnel events are tracked once academy claiming exists.
* Monthly visitors, weekly active users, returning users, and monthly searches are measurable.

---

## MR-004: Open Mat Contact Information

Priority: Medium

Implementation branch:

`feature/open-mat-contact-info`

User story:

As a practitioner, I want contact information on an open mat listing so that I can confirm attendance details before travelling.

IF/WHEN/THEN requirements:

### MR-004.1: Contact Display

IF a user views an open mat detail page

WHEN academy or event contact information exists

THEN the system SHALL show contact email and/or phone on the open mat detail page.

### MR-004.2: Academy Contact Fallback

IF an open mat has no event-specific contact information

WHEN the detail page renders

THEN the system SHALL show academy contact information when available.

---

## MR-005: Search Performance Acceptance Check

Priority: Medium

Implementation branch:

`feature/search-performance-check`

User story:

As a practitioner, I want search results to load quickly so that I can find training within 30 seconds.

IF/WHEN/THEN requirements:

### MR-005.1: Academy Search Check

IF academy search is tested against seeded data

WHEN the check runs

THEN academy search response time SHALL be checked against a 2 second target.

### MR-005.2: Open Mat Search Check

IF open mat search is tested against seeded data

WHEN the check runs

THEN open mat search response time SHALL be checked against a 2 second target.

---

## MR-006: Product Decision Updates For Auth And Hosting

Priority: Low

Implementation branch:

`docs/current-platform-decisions`

User story:

As the product owner, I want the PRD to reflect implemented platform decisions so future work is judged against the real architecture.

IF/WHEN/THEN requirements:

### MR-006.1: Auth Decision

IF the MVP technical requirements are reviewed

WHEN authentication is documented

THEN the docs SHALL identify NextAuth credentials as the current implemented auth provider.

### MR-006.2: Hosting Decision

IF the MVP technical requirements are reviewed

WHEN hosting is documented

THEN the docs SHALL identify AWS ECS/Terraform as the current implemented hosting/deployment platform.

---

# Recommended Sequence

1. MR-001: Complete academy claiming.
2. MR-003: Add MVP analytics.
3. MR-002: Replace generic map embed with data-driven markers.
4. MR-004: Add open mat contact information.
5. MR-005: Add search performance checks.
6. MR-006: Update platform decision documentation.
