# PRD: Recurring Rollings And Open Mats

Version: 1.0

Priority: High

Release: Next beta feature candidate

Review date: 2026-06-05

Product: RollFinders

---

# Objective

Allow admins to create a rolling/open mat once and define whether it repeats weekly, monthly, yearly, or not at all, so recurring training sessions appear on the correct future dates without the admin manually recreating the same session.

---

# Product Context

RollFinders currently supports open mat creation and includes a basic recurring checkbox that creates matching weekly open mats for the next 12 weeks.

This feature should replace that limited checkbox with a structured recurrence model. Some academies host rollings every week, for example every Monday from 6:00pm to 7:00pm. Other academies host one-off sessions. Admins need to specify the correct recurrence pattern when creating or editing a rolling.

The public Open Mat Radar should continue to show real upcoming training opportunities on the right dates. A recurring rolling should appear as future occurrences without the admin needing to create each one manually.

---

# User Stories

As an academy admin, I want to mark a rolling as recurring every week, month, or year so that I do not need to recreate the same session repeatedly.

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
* Recurrence options: none, weekly, monthly, yearly.
* Weekly recurrence on the same weekday as the selected start date.
* Monthly recurrence on the same day of month as the selected start date, with clear end-of-month handling.
* Yearly recurrence on the same month and day as the selected start date.
* Recurrence start date.
* Optional recurrence end date or occurrence limit.
* Public display of recurring occurrences on correct future dates.
* Admin list/detail visibility for recurrence state.
* Duplicate prevention across generated or materialized occurrences.
* Role-based authorization consistent with existing open mat management.

Out of scope:

* Payments or paid featured recurring rollings.
* Complex recurrence rules such as every second Monday, multiple weekdays, custom intervals, exceptions, or holiday skipping.
* Waitlists, bookings, or attendance tracking.
* Timezone management beyond the existing application date/time behavior.
* Replacing public Open Mat Radar search and filter behavior.

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

* Recurrence type: `NONE`, `WEEKLY`, `MONTHLY`, `YEARLY`
* Recurrence start date
* Optional recurrence end date
* Optional occurrence limit
* Parent recurring series ID or equivalent link between occurrences
* Occurrence date for each visible instance, if occurrences are materialized
* Active/inactive state
* Created by user ID
* Academy ID

Implementation may choose either:

* Generate future `Event` occurrence records from a recurring series.
* Store recurrence rules and expand occurrences at query time.

The chosen approach must keep public Open Mat Radar fast and predictable.

---

# IF/WHEN/THEN Requirements

## RR-001: Recurrence Control

IF an authorized admin opens the create or edit rolling/open mat form

WHEN the form renders

THEN the system SHALL provide a recurrence control with options for `Does not repeat`, `Weekly`, `Monthly`, and `Yearly`.

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

## RR-005: Yearly Recurrence

IF an admin selects `Yearly`

WHEN the rolling is saved with a start date and time

THEN the system SHALL make the rolling appear once per year on the same month and day.

Done when:

* Future yearly occurrences preserve the selected month, day, start time, and end time.
* Leap-day behavior is documented if the selected date is February 29.

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

Done when:

* Admins are not surprised by changes applying to multiple future dates.
* The edit behavior is explicit before saving.

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
* Monthly and yearly recurrence edge cases are handled predictably.

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

* Admins can choose no recurrence, weekly, monthly, or yearly recurrence.
* Weekly rollings appear on the same weekday and time.
* Monthly rollings appear on the same day of month, with documented end-of-month fallback.
* Yearly rollings appear on the same month and day.
* Recurring rollings appear in public Open Mat Radar on the correct upcoming dates.
* Recurring rollings appear on academy profile upcoming open mats.
* Admins can identify recurring rollings in management views.
* Editing/deleting recurrence scope is explicit.
* Duplicate visible occurrences are prevented.
* Existing open mat permissions are preserved.
* Public open mat search performance remains acceptable.

---

# Implementation Notes

Recommended beta implementation:

1. Add structured recurrence fields to the open mat/event model or add a separate recurring series model.
2. Replace the current `recurring` checkbox with a recurrence select.
3. Start with whole-series create/edit/delete.
4. Generate or expose occurrences for the next 12 months.
5. Keep duplicate prevention based on academy, title, occurrence date, and start time.
6. Defer custom intervals, multiple weekdays, and exception dates.

---

# Open Questions

* Should the user-facing label be `Rolling`, `Open Mat`, or `Rolling / Open Mat`?
* Should recurrence be stored as generated `Event` records or expanded from a recurrence rule at query time?
* Should admins be allowed to edit/delete one occurrence during beta, or only the full series?
* Should monthly recurrence on the 29th, 30th, or 31st use the last valid day in shorter months?
* Should recurring rollings have an explicit end date by default, or use the recommended 12-month rolling window?
