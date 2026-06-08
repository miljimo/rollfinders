# PRD: Recurring Rollings And Open Mats

Version: 1.0

Priority: High

Release: Next beta feature candidate

Status: Done

Review date: 2026-06-05

Product: RollFinders

Completed implementation: 2026-06-05 in commit `daabed2 feat: support recurring open mat occurrences`

---

# Objective

Allow admins to create a rolling/open mat once and define whether it repeats weekly, monthly, or not at all, so recurring training sessions appear on the correct future dates without the admin manually recreating the same session.

---

# Product Context

RollFinders currently supports open mat creation and includes a basic recurring checkbox that creates matching weekly open mats for the next 12 weeks.

This feature should replace that limited checkbox with a structured recurrence model. Some academies host rollings every week, for example every Monday from 6:00pm to 7:00pm. Other academies host one-off sessions. Admins need to specify the correct recurrence pattern when creating or editing a rolling.

The public Open Mat Radar should continue to show real upcoming training opportunities on the right dates. A recurring rolling should appear as future occurrences without the admin needing to create each one manually.

Recurring rollings must not create duplicate event rows for each future date. The system should store one managed recurring listing/rule and derive visible dated occurrences from that rule. A single edit to the recurring listing should apply to all future generated occurrences unless a future exception model is explicitly added.

---

# User Stories

As an academy admin, I want to mark a rolling as recurring every week or month so that I do not need to recreate the same session repeatedly.

As a platform admin, I want recurring rollings to generate or appear predictably so that public open mat data stays accurate.

As a practitioner, I want recurring rollings to appear on the correct upcoming dates so that I can decide where to train today, tomorrow, this weekend, or later.

---

# Terminology

Use these terms consistently:

* `Rolling` is the user-friendly BJJ wording for a training session.
* `Open Mat` is the existing product and codebase term.
* `Event` is the current database model used for open mat records.
* `Recurring series` means the parent rule that describes how a rolling repeats.
* `Occurrence` means one visible dated instance of a recurring rolling.

The UI may continue using `Open Mat` where the product already does, but the recurrence feature should support the concept of recurring rollings/open mats.

---

# Scope

In scope:

* Admin recurrence controls on open mat create/edit forms.
* Recurrence options: none, weekly, monthly.
* Weekly recurrence on the same weekday as the selected start date.
* Monthly recurrence on the same day of month as the selected start date, with clear end-of-month handling.
* Recurrence start date.
* Optional recurrence end date or occurrence limit.
* Public display of recurring occurrences on correct future dates.
* Public "in session" state for open mats that are currently happening.
* Automatic removal of completed open mats from public upcoming listings while retaining them as historical system records.
* Admin list/detail visibility for recurrence state.
* Duplicate prevention across generated or derived occurrences.
* Role-based authorization consistent with existing open mat management.

Out of scope:

* Payments or paid featured recurring rollings.
* Complex recurrence rules such as every second Monday, multiple weekdays, custom intervals, exceptions, or holiday skipping.
* Waitlists, bookings, or attendance tracking.
* Timezone management beyond the existing application date/time behavior.
* Replacing public Open Mat Radar search and filter behavior.
* Per-occurrence overrides/exceptions during beta, unless separately approved.
* Daily recurrence during beta.
* Yearly recurrence during beta.
* User-facing controls for "show next N occurrences" during beta.

---

# Existing Flow Constraints

This feature must preserve:

* Public `/open-mats` browsing.
* Public `/open-mats/[id]` detail pages.
* Public academy profile upcoming open mats.
* Admin `/admin/open-mats` list behavior.
* Admin open mat create, edit, and delete permissions.
* Existing academy-scoped access rules.
* Existing duplicate open mat safeguards.

---

# Data Requirements

The implementation SHOULD add a recurrence-aware structure instead of relying only on the current `recurring` checkbox.

Minimum data needed:

* Recurrence type: `NONE`, `WEEKLY`, `MONTHLY`
* Recurrence start date
* Optional recurrence end date
* Optional occurrence limit
* Recurring series/listing ID
* Derived occurrence date for each visible instance
* Active/inactive state
* Created by user ID
* Academy ID
* Historical visibility state for completed sessions

Preferred beta implementation:

* Store recurrence rules and expand occurrences at query time.
* Do not create future duplicate `Event` records for recurring sessions.
* Treat generated occurrences as read models/view models for public listing, detail, academy profile, and map contexts.

The chosen approach must keep public Open Mat Radar fast and predictable. If the system later materializes occurrences for analytics or audit purposes, materialized rows must be derived history records and must not become separately editable duplicate source records.

---

# IF/WHEN/THEN Requirements

## RR-001: Recurrence Control

IF an authorized admin opens the create or edit rolling/open mat form

WHEN the form renders

THEN the system SHALL provide a recurrence control with options for `Does not repeat`, `Weekly`, and `Monthly`.

Done when:

* The existing single `Repeat weekly on this day` checkbox is replaced or upgraded.
* The default value is `Does not repeat`.
* The selected recurrence is submitted with the form.

---

## RR-002: One-Off Rolling

IF an admin selects `Does not repeat`

WHEN the rolling is saved

THEN the system SHALL create or update only the selected dated rolling.

Done when:

* No additional future occurrences are created or displayed from this rolling.
* Existing one-off open mat behavior remains unchanged.

---

## RR-003: Weekly Recurrence

IF an admin selects `Weekly`

WHEN the rolling is saved with a start date and time

THEN the system SHALL make the rolling appear every week on the same weekday and time.

Example:

* Start date: Monday 2026-06-08
* Time: 18:00 to 19:00
* Result: the rolling appears every Monday from 18:00 to 19:00 while the recurrence is active.

Done when:

* Future weekly occurrences use the weekday from the selected start date.
* Public views show the correct upcoming Monday occurrences.
* Admin does not need to recreate the rolling each week.

---

## RR-004: Monthly Recurrence

IF an admin selects `Monthly`

WHEN the rolling is saved with a start date and time

THEN the system SHALL make the rolling appear every month on the same day of month and time.

Done when:

* Future monthly occurrences use the selected day of month where possible.
* If a month does not contain that day, the system SHALL use a documented fallback, recommended: last valid day of that month.
* Public views show only valid calendar dates.

---

## RR-005: Deferred Daily And Yearly Recurrence

IF an admin creates or edits a rolling/open mat during beta

WHEN recurrence options are shown or submitted

THEN the system SHALL NOT support `Daily` or `Yearly` recurrence.

Done when:

* The admin recurrence control does not show `Daily` or `Yearly`.
* Direct submissions using unsupported recurrence values are rejected.
* The beta remains focused on weekly and monthly recurrence.

---

## RR-006: Recurrence End

IF an admin configures a recurring rolling

WHEN the form renders

THEN the system SHOULD allow the admin to set either an end date or use a platform default future generation window.

Recommended beta default:

* Generate or display occurrences up to 12 months ahead.

Done when:

* Infinite recurrence does not create unbounded database records.
* Public queries stay performant.
* Admin understands how far ahead the rolling will appear.

---

## RR-007: Public Open Mat Radar

IF a rolling has an active recurrence rule

WHEN a practitioner opens `/open-mats`

THEN the system SHALL show upcoming occurrences that match the selected date filter, search, location, and gi/no-gi filters.

Done when:

* Today, tomorrow, weekend, and general upcoming filters include recurring occurrences.
* Past occurrences are not shown as upcoming.
* Occurrences sort by occurrence date and start time.

---

## RR-007C: Internal Public Occurrence Guardrails

IF a recurring rolling has more valid upcoming derived occurrences than the beta display guardrail

WHEN public discovery surfaces render that recurring source listing

THEN the system SHOULD show only the nearest upcoming occurrences for that listing within the allowed guardrail.

Beta guardrails:

* Weekly recurring listings: show no more than the next 4 valid upcoming occurrences per source listing.
* Monthly recurring listings: show no more than the next 6 valid upcoming occurrences per source listing.

Done when:

* Guardrails apply per recurring source listing, not globally across the whole page.
* Finished occurrences are excluded before the guardrail is applied.
* Guardrails are not exposed as configurable user-facing settings.
* Occurrences kept by the guardrail are ordered by occurrence date and start time.

---

## RR-007D: Recurring Rolling Discovery Trust Priority

IF recurring rolling occurrences include sessions from approved/managed and unclaimed academies

WHEN public discovery surfaces sort derived recurring occurrences

THEN the system SHALL use academy discovery trust ranking to prioritize which derived occurrences qualify for top-list prominence while preserving closest-first card order when user location is available.

Done when:

* Derived recurring occurrences follow the same academy discovery trust ranking policy as Open Mat Radar.
* Verified-and-managed, managed, and verified academy sessions are boosted during candidate selection over otherwise comparable unclaimed academy sessions.
* When distance is available, visible recurring occurrence cards are sorted by closest distance first after filters and candidate priority are applied.
* Trust ranking does not create duplicate recurring occurrence records.
* Trust ranking does not show completed occurrences after their end time.

---

## RR-007A: In-Session Public State

IF a visible open mat occurrence has started but has not ended

WHEN a practitioner views `/open-mats`, an Open Mat card, the latest upcoming UI such as `Upcoming Near You`, public academy profile upcoming sessions, map details, or the open mat detail page

THEN the UI SHALL clearly indicate that the open mat is currently in session.

Done when:

* The state is derived from occurrence date, start time, end time, and the application's configured timezone behavior.
* The Open Mat card uses a visible badge or status label such as `In session` when the occurrence is currently happening.
* The latest upcoming UI uses the same `In session` indication so users can distinguish currently active sessions from later upcoming sessions.
* The open mat detail page uses a clear phrase such as `In session`.
* In-session occurrences remain visible until their end time.
* In-session state works for both one-off open mats and derived recurring occurrences.
* The indication does not replace the displayed occurrence date/time; users can still see when the session started or is scheduled.

---

## RR-007B: Completed Session Public Visibility

IF an open mat occurrence has ended

WHEN a practitioner views public discovery surfaces

THEN the system SHALL stop showing that occurrence as an upcoming/publicly discoverable session.

Done when:

* Completed occurrences do not appear in `/open-mats` search results, public academy upcoming open mats, homepage upcoming open mats, or map upcoming summaries.
* Completed one-off event records remain in the database for admin/history/audit use.
* Completed derived recurring occurrences remain derivable as historical occurrences without becoming duplicate editable source records.
* Admin views can distinguish active/upcoming, in-session, completed, and inactive sessions where relevant.

---

## RR-008: Academy Profile Upcoming Rollings

IF an academy has active recurring rollings

WHEN a practitioner opens the academy profile

THEN the system SHALL show the next upcoming occurrences in the academy's upcoming open mats section.

Done when:

* Academy profiles do not require manually created future copies for recurring rollings.
* Occurrences link to an appropriate detail page.

---

## RR-009: Open Mat Detail Page

IF a practitioner opens a recurring rolling occurrence

WHEN the detail page renders

THEN the system SHALL show the occurrence date, time, academy, gi type, price, and relevant recurrence context.

Done when:

* The user can tell which dated session they are viewing.
* The page does not imply every recurrence is a separate academy-created listing if it is generated from a series.

---

## RR-010: Admin List Recurrence State

IF an admin opens `/admin/open-mats`

WHEN recurring rollings exist

THEN the list SHOULD show whether a rolling is one-off or recurring.

Done when:

* Admins can distinguish one-off rollings from recurring series.
* Existing filters and pagination continue to work.

---

## RR-011: Edit Single Occurrence Or Series

IF an admin edits a recurring rolling

WHEN the rolling belongs to a recurring series

THEN the system SHALL make clear whether the edit affects only one occurrence or the whole recurring series.

Beta recommendation:

* Support editing the whole series first.
* Defer single-occurrence exceptions unless required during beta.
* A single edit to the recurring listing SHALL update all future derived occurrences.

Done when:

* Admins are not surprised by changes applying to multiple future dates.
* The edit behavior is explicit before saving.
* No duplicate future event records need to be updated to keep the recurrence in sync.

---

## RR-012: Delete Single Occurrence Or Series

IF an admin deletes a recurring rolling

WHEN the rolling belongs to a recurring series

THEN the system SHALL make clear whether the delete affects one occurrence or the whole recurring series.

Beta recommendation:

* Support deleting or deactivating the whole series first.
* Defer single-occurrence deletion/exceptions unless required during beta.

Done when:

* Public views stop showing deleted/deactivated future occurrences.
* Existing open mat delete permissions are preserved.

---

## RR-013: Duplicate Prevention

IF a recurring rolling would create or display an occurrence that duplicates an existing rolling for the same academy, title, date, and start time

WHEN occurrences are generated or queried

THEN the system SHALL prevent duplicate visible rollings.

Done when:

* Public users do not see duplicate cards for the same session.
* Admins receive a clear validation message when a recurrence conflicts with existing data.
* The recurrence engine does not create duplicate database rows for future occurrences.

---

## RR-017: Single Source Recurring Listing

IF an admin creates a recurring rolling/open mat

WHEN the save succeeds

THEN the database SHALL store one source listing/rule for the recurring open mat rather than one event row per future occurrence.

Done when:

* Weekly and monthly recurring sessions are represented by one editable source record.
* Public queries derive upcoming occurrences from the source record within a bounded window.
* Updating title, description, time, gi type, capacity, cost, academy, or active state on the source record updates all future derived occurrences.
* The system does not need a batch update to keep duplicate future rows in sync.
* Historical occurrence reporting can be computed from the rule or stored separately as immutable history, not as editable duplicate events.

---

## RR-018: Session History

IF an open mat occurrence has completed

WHEN the system evaluates public and admin data

THEN the occurrence SHALL be hidden from public upcoming discovery but remain available to the system as history.

Done when:

* Admin reporting can count completed one-off and recurring occurrences.
* Public pages only show future or currently in-session occurrences.
* Historical records do not interfere with duplicate prevention for future occurrences.
* Analytics and audit workflows can distinguish generated historical occurrences from source recurring listings.

---

## RR-014: Authorization

IF a user creates, edits, or deletes a recurring rolling

WHEN the request reaches the backend

THEN the system SHALL enforce existing open mat authorization rules.

Done when:

* Academy admins can manage only permitted academy rollings.
* Platform admins and super admins retain existing broader access.
* Unauthorized users cannot create or modify recurrence rules through direct requests.

---

## RR-015: Validation

IF an admin submits recurrence data

WHEN recurrence fields are invalid

THEN the system SHALL reject the save and show validation errors.

Done when:

* Recurrence type accepts only supported values.
* End date, if provided, must be on or after the start date.
* Start time and end time retain existing validation.
* Monthly recurrence edge cases are handled predictably.

---

## RR-016: Performance

IF public open mat queries include recurring rollings

WHEN search, date bucket, and location filters run

THEN the system SHALL keep query and rendering performance within the existing MVP target.

Done when:

* Open Mat Radar still responds within the existing 2 second target under seeded beta data.
* Recurrence expansion does not create unbounded query work.

---

# Acceptance Criteria

* Admins can choose no recurrence, weekly, or monthly recurrence.
* Weekly rollings appear on the same weekday and time.
* Monthly rollings appear on the same day of month, with documented end-of-month fallback.
* Daily and yearly recurrence are not available during beta.
* Recurring rollings appear in public Open Mat Radar on the correct upcoming dates.
* Recurring rollings appear on academy profile upcoming open mats.
* Weekly recurring listings show no more than the next 4 valid upcoming occurrences per source listing on public discovery surfaces.
* Monthly recurring listings show no more than the next 6 valid upcoming occurrences per source listing on public discovery surfaces.
* Recurring rolling discovery applies academy trust ranking for candidate priority, then keeps distance-aware card grids closest-first where distance is available.
* Open mats currently in progress show an `In session` state publicly on Open Mat cards, latest upcoming UI, public academy upcoming sections, map details, and detail pages.
* Completed sessions disappear from public upcoming discovery after their end time.
* Completed sessions remain trackable as system/admin history.
* Admins can identify recurring rollings in management views.
* Editing/deleting recurrence scope is explicit.
* Recurring sessions use one source database record/rule, not duplicate future event rows.
* A single edit to a recurring source listing updates all future derived occurrences.
* Duplicate visible occurrences are prevented.
* Existing open mat permissions are preserved.
* Public open mat search performance remains acceptable.

---

# Implementation Notes

Recommended beta implementation:

1. Add structured recurrence fields to the open mat/event model or add a separate recurring series model.
2. Replace the current `recurring` checkbox with a recurrence select.
3. Start with whole-series create/edit/delete.
4. Expose derived occurrences for the next 12 months without creating duplicate future event rows.
5. Keep duplicate prevention based on academy, title, occurrence date, and start time.
6. Add public occurrence status calculation: upcoming, in session, completed.
7. Hide completed occurrences from public discovery while preserving history/reporting.
8. Apply internal per-listing public display guardrails after filtering out completed occurrences: 4 weekly occurrences and 6 monthly occurrences.
9. Defer daily recurrence, yearly recurrence, custom intervals, multiple weekdays, and exception dates.

---

# Open Questions

* Should the user-facing label be `Rolling`, `Open Mat`, or `Rolling / Open Mat`?
* Should recurrence be stored as generated `Event` records or expanded from a recurrence rule at query time? Proposed answer: expand from a single recurrence rule at query time for beta.
* Should admins be allowed to edit/delete one occurrence during beta, or only the full series?
* Should monthly recurrence on the 29th, 30th, or 31st use the last valid day in shorter months?
* Should recurring rollings have an explicit end date by default, or use the recommended 12-month rolling window?
* Should historical recurring occurrences be purely computed from the recurrence rule, or should the system write immutable occurrence-history rows after sessions complete for analytics/reporting?
