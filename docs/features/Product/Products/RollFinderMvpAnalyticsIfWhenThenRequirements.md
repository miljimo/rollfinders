# PRD: MVP Analytics For Success Metrics

Version: 1.0

Priority: High

Source Requirement: `docs/features/Product/Products/RollFinderMissingMvpRequirementsPrd.md` MR-003

Review date: 2026-06-04

---

# Implementation Branch

Use branch:

`feature/mvp-analytics-success-metrics`

Branch purpose:

* Select and configure the MVP analytics provider.
* Configure production analytics.
* Track page views, searches, profile/detail views, directions clicks, map events, and claim funnel events.
* Make MVP visitor, active user, returning user, and search metrics measurable.

---

# User Story

As the founder, I want analytics for discovery behavior so that I can measure whether the MVP is reaching traction.

---

# Scope

In scope:

* Analytics provider decision.
* Production provider configuration.
* Page view tracking.
* Search submission tracking.
* Open mat and academy profile view tracking.
* Directions click tracking.
* Map view and marker click tracking.
* Claim funnel tracking once academy claiming exists.
* Lightweight reporting path for MVP success metrics.

Out of scope:

* Full BI warehouse.
* A/B testing.
* Revenue analytics.
* Paid subscription analytics.
* Session replay.
* Heatmaps.
* Individual user profiling.
* Advertising attribution beyond provider defaults.

---

# Event Names

Use these stable event names:

* `academy_search_submitted`
* `open_mat_search_submitted`
* `open_mat_detail_viewed`
* `academy_profile_viewed`
* `directions_clicked`
* `map_viewed`
* `map_marker_clicked`
* `claim_profile_started`
* `claim_profile_submitted`

Privacy rule:

* Do not send raw email addresses, phone numbers, exact user latitude/longitude, free-form claim notes, or verification evidence to analytics.

---

# Requirement 1: Production Analytics Provider

IF the RollFinder application is deployed to production

WHEN the application starts or renders public pages

THEN the system SHALL load the selected analytics provider using production configuration.

Acceptance criteria:

* Analytics provider is selected before production launch.
* Provider configuration is controlled through environment variables.
* Missing analytics configuration SHALL NOT break public pages.
* Analytics can be disabled in local development.

---

# Requirement 2: Provider Decision

IF the analytics provider has not been selected

WHEN implementation work begins

THEN the team SHALL document whether RollFinder is using Google Analytics, PostHog, or another approved provider.

Acceptance criteria:

* Decision names Google Analytics, PostHog, or another approved provider.
* Decision explains how the provider will measure monthly visitors, weekly active users, returning users, and monthly searches.
* Decision explains whether cookie consent is required before tracking.

---

# Requirement 3: Page View Tracking

IF a user visits a public RollFinder page

WHEN the page renders successfully

THEN the system SHALL track a page view.

Acceptance criteria:

* Page views are tracked for public discovery pages.
* Page views support reporting top public pages.
* Page views support reporting monthly visitors.
* Page views support reporting weekly active users.
* Page views support reporting returning users.

---

# Requirement 4: Academy Search Tracking

IF a user submits an academy search

WHEN the search request is accepted by the application

THEN the system SHALL track an `academy_search_submitted` event.

Acceptance criteria:

* Event fires once per academy search submission.
* Event includes `query_present`, `query_length`, `has_location`, and `result_count` when available.
* Event SHALL NOT include raw exact latitude/longitude.
* Event SHALL NOT include sensitive personal data.

---

# Requirement 5: Open Mat Search And Filter Tracking

IF a user submits an open mat search or filter action

WHEN the search or filter request is accepted by the application

THEN the system SHALL track an `open_mat_search_submitted` event.

Acceptance criteria:

* Event fires once per open mat search or filter submission.
* Event includes `query_present`, `query_length`, `when_filter`, `gi_filter`, `has_location`, and `result_count` when available.
* Event SHALL NOT include sensitive personal data.

---

# Requirement 6: Open Mat Detail View Tracking

IF a user opens an open mat detail page

WHEN the open mat detail page renders successfully

THEN the system SHALL track an `open_mat_detail_viewed` event.

Acceptance criteria:

* Event includes `open_mat_id`, `academy_id`, and `gi_type` when available.
* Event supports reporting open mat detail views and most viewed open mats.

---

# Requirement 7: Academy Profile View Tracking

IF a user opens a public academy profile page

WHEN the academy profile renders successfully

THEN the system SHALL track an `academy_profile_viewed` event.

Acceptance criteria:

* Event includes `academy_id`.
* Event includes whether the academy has upcoming open mats when available.
* Event supports reporting academy profile views and most viewed academies.
* Event SHALL NOT expose private admin data.

---

# Requirement 8: Directions Click Tracking

IF a user clicks a directions link or map navigation action

WHEN the application begins navigation to the map provider

THEN the system SHALL track a `directions_clicked` event.

Acceptance criteria:

* Event includes `source`.
* Event includes `academy_id` when available.
* Event includes `open_mat_id` when the click comes from an open mat context.
* Event supports reporting directions clicks and directions click rate from detail pages.
* Tracking SHALL NOT block external navigation.

---

# Requirement 9: Map View Tracking

IF a user opens the RollFinder map page

WHEN the map page renders successfully

THEN the system SHALL track a `map_viewed` event.

Acceptance criteria:

* Event includes `provider` when known.
* Event includes `has_provider_key`.
* Event includes `academy_marker_count` and `open_mat_marker_count` once data-driven markers exist.
* Event supports reporting map views.

---

# Requirement 10: Map Marker Click Tracking

IF the RollFinder map displays data-driven academy or open mat markers

WHEN a user clicks a map marker

THEN the system SHALL track a `map_marker_clicked` event.

Acceptance criteria:

* Event includes `marker_type`.
* Event includes `academy_id`.
* Event includes `open_mat_id` when the marker represents an open mat.
* Event supports reporting marker engagement.
* Event is required once data-driven map markers are implemented.

---

# Requirement 11: Claim Profile Started Tracking

IF a user starts the academy claim flow

WHEN the user clicks "Claim Profile" or opens the claim form

THEN the system SHALL track a `claim_profile_started` event.

Acceptance criteria:

* Event includes `academy_id`.
* Event supports claim funnel reporting.
* Event SHALL NOT include requester name.
* Event SHALL NOT include requester email.
* Event SHALL NOT include verification notes or evidence.

---

# Requirement 12: Claim Profile Submitted Tracking

IF a user submits an academy claim request

WHEN the application successfully stores the claim request

THEN the system SHALL track a `claim_profile_submitted` event.

Acceptance criteria:

* Event fires only after claim submission succeeds.
* Event includes `academy_id`.
* Event includes `claim_status`.
* Event supports claim start-to-submit conversion reporting.
* Event SHALL NOT include requester name.
* Event SHALL NOT include requester email.
* Event SHALL NOT include verification notes or evidence.

---

# Requirement 13: Monthly Visitor Reporting

IF the founder reviews MVP traction

WHEN the founder opens the analytics reporting path

THEN the system SHALL make monthly visitor counts measurable.

Acceptance criteria:

* Monthly visitors can be reviewed without code changes.
* Monthly visitors can be checked weekly during the first 90 days.
* Monthly visitors support comparison against the MVP target of 3,000 monthly visitors.

---

# Requirement 14: Weekly Active User Reporting

IF the founder reviews MVP traction

WHEN the founder opens the analytics reporting path

THEN the system SHALL make weekly active users measurable.

Acceptance criteria:

* Weekly active users can be reviewed without code changes.
* Weekly active users support comparison against the MVP target of 500 weekly active users.

---

# Requirement 15: Returning User Reporting

IF the founder reviews retention signals

WHEN the founder opens the analytics reporting path

THEN the system SHALL make returning user percentage measurable.

Acceptance criteria:

* Returning user percentage can be reviewed without code changes.
* Returning user percentage supports comparison against the MVP target of 30% returning users.

---

# Requirement 16: Monthly Search Reporting

IF the founder reviews discovery demand

WHEN the founder opens the analytics reporting path

THEN the system SHALL make monthly searches measurable.

Acceptance criteria:

* Monthly searches include academy search submissions.
* Monthly searches include open mat search/filter submissions.
* Monthly searches support comparison against the MVP target of 1,000 monthly searches.
* Search reporting can separate academy searches from open mat searches.

---

# Requirement 17: Discovery Behavior Reporting

IF the founder reviews discovery behavior

WHEN the founder opens the analytics reporting path

THEN the system SHALL make profile views, detail views, directions clicks, map views, and map marker clicks measurable.

Acceptance criteria:

* Academy profile views are measurable.
* Open mat detail views are measurable.
* Directions clicks are measurable.
* Map views are measurable.
* Map marker clicks are measurable once data-driven map markers exist.
* Reporting helps identify which academies and open mats receive the most user interest.

---

# Requirement 18: Claim Funnel Reporting

IF the founder reviews academy owner adoption

WHEN the founder opens the analytics reporting path

THEN the system SHALL make claim funnel events measurable.

Acceptance criteria:

* Claim profile starts are measurable.
* Claim profile submissions are measurable.
* Claim start-to-submit conversion rate is measurable.
* Claim funnel reporting excludes requester personal data.
* Claim funnel reporting is required once academy claiming is implemented.

---

# Requirement 19: Privacy-Safe Analytics

IF analytics events are tracked

WHEN event payloads are sent to the analytics provider

THEN the system SHALL avoid sending sensitive personal data.

Acceptance criteria:

* Analytics SHALL NOT send raw email addresses.
* Analytics SHALL NOT send phone numbers.
* Analytics SHALL NOT send exact user latitude or longitude.
* Analytics SHALL NOT send free-form claim notes or verification evidence.
* Analytics SHALL use academy IDs and open mat IDs where object-level reporting is needed.
* Analytics SHALL use broad location fields such as borough or postcode area where useful.

---

# Requirement 20: Analytics Failure Safety

IF the analytics provider is unavailable or event tracking fails

WHEN a user searches, views a page, clicks directions, opens the map, or submits a claim

THEN the system SHALL allow the user flow to continue.

Acceptance criteria:

* Analytics failures do not block page rendering.
* Analytics failures do not block search submissions.
* Analytics failures do not block external directions navigation.
* Analytics failures do not block claim submission.
* Analytics failures do not expose errors to public users unless required for debugging in non-production environments.

---

# Requirement 21: Reporting Path

IF analytics is configured for production

WHEN MVP launch readiness is reviewed

THEN the team SHALL document how the founder can access MVP analytics reports.

Acceptance criteria:

* Reporting path is documented.
* Reporting path identifies where to find monthly visitors.
* Reporting path identifies where to find weekly active users.
* Reporting path identifies where to find returning users.
* Reporting path identifies where to find monthly searches.
* Reporting path identifies where to find claim funnel metrics.

---

# Requirement 22: Launch Readiness

IF RollFinder is considered ready for MVP production launch

WHEN launch readiness is reviewed

THEN analytics SHALL be configured and verified for the core MVP metrics.

Acceptance criteria:

* Analytics provider is configured for production.
* Page views are tracked.
* Search submissions are tracked.
* Open mat detail views are tracked.
* Academy profile views are tracked.
* Direction clicks are tracked.
* Claim funnel events are tracked once academy claiming exists.
* Monthly visitors are measurable.
* Weekly active users are measurable.
* Returning users are measurable.
* Monthly searches are measurable.
