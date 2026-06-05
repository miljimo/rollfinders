# PRD: Pending Academies

Version: 1.0

Priority: High

Review date: 2026-06-05

Branch:

`feature/pending-academies-workflow`

---

# Objective

Make pending academies easy for admins to find, review, and move through the verification workflow.

This requirement covers the `Pending Verification` admin dashboard metric, the pending academy list/filter behavior, and navigation from pending counts into actionable academy records.

---

# Current Source Context

Existing model:

* `prisma/schema.prisma`
* `Academy.verificationStatus`
* `AcademyVerificationStatus.PENDING`

Existing UI:

* `src/app/admin/page.tsx`
* `src/app/admin/academies/page.tsx`
* `src/app/admin/academies/[id]/page.tsx`
* `src/app/admin/academies/form.tsx`

Current behavior:

* Admin dashboard already counts pending academies.
* Academy management page already has a Verification filter with Pending, Verified, and Rejected options.
* Academy detail page shows verification status.

---

# User Story

As an admin, I want to see and open pending academies quickly so that I can review academy records that still need verification.

---

# Scope

In scope:

* Pending Verification metric behavior.
* Pending academies filter/list behavior.
* Pending academy navigation from dashboard to academy management.
* Pending status display on academy table and detail page.
* Role-scoped pending academy visibility.

Out of scope:

* Public claim request intake.
* Paid verification.
* External business registry checks.
* Academy reviews/ratings.

---

# IF/WHEN/THEN Requirements

## PA-001: Pending Metric Count

IF an authorized admin opens `/admin`

WHEN academy records exist with `verificationStatus = PENDING`

THEN the dashboard SHALL show the count in a `Pending Verification` metric.

Done when:

* Count uses `AcademyVerificationStatus.PENDING`.
* Academy admins see only their academy-scoped count.
* Platform-level admins see platform-wide count.

---

## PA-002: Pending Metric Navigation

IF the `Pending Verification` metric is displayed

WHEN the admin clicks or activates it

THEN the UI SHOULD navigate to `/admin/academies?verificationStatus=PENDING`.

Done when:

* Navigation applies the pending filter.
* Existing dashboard layout remains intact.
* Metric remains readable if not made clickable.

---

## PA-003: Pending Academy Filter

IF an admin opens `/admin/academies`

WHEN the admin selects `Pending` in the Verification filter

THEN the academy table SHALL show only academies with `verificationStatus = PENDING`.

Done when:

* URL query stores `verificationStatus=PENDING`.
* Selected filter value persists after submit.
* Pagination works with filtered results.

---

## PA-004: Pending Table Status

IF an academy row has `verificationStatus = PENDING`

WHEN the academy table renders

THEN the Verification Status column SHALL display a pending status badge.

Done when:

* Badge text is readable as `PENDING` or `Pending`.
* Badge styling is visually distinct from verified and rejected.

---

## PA-005: Pending Academy Detail Status

IF an admin opens a pending academy detail page

WHEN the page renders

THEN the page SHALL show that the academy is awaiting verification action.

Done when:

* Current status badge shows `PENDING`.
* Administrative Actions section communicates awaiting verification.
* Public profile link remains available.

---

## PA-006: Pending Empty State

IF no academies match the pending filter

WHEN `/admin/academies?verificationStatus=PENDING` renders

THEN the table SHALL show a clear empty state.

Done when:

* Empty state says no academies match the filter.
* Reset link returns to unfiltered academy management.

---

## PA-007: Pending Role Scope

IF an academy admin opens pending academy views

WHEN their role scope is applied

THEN they SHALL only see pending status for their assigned academy.

Done when:

* Academy-scoped filters use `academyScopedAcademyWhere`.
* Academy admins cannot inspect unrelated pending academies.

---

## PA-008: Pending Does Not Mean Verified

IF an academy has `verificationStatus = PENDING`

WHEN public academy profile or academy card renders

THEN the UI SHALL NOT show the academy as verified.

Done when:

* Public verified badge appears only when academy is verified.
* Pending academies do not receive verified styling.

---

# Acceptance Criteria

* Dashboard pending count is accurate.
* Pending metric can guide admins to the filtered pending academy list.
* Academy management can filter to pending academies.
* Pending status is visible in academy table and detail page.
* Role scoping is respected.
* Pending academies are not presented as verified publicly.

---

# Implementation Notes

Suggested small implementation path:

1. Make the dashboard `Pending Verification` metric clickable.
2. Verify `/admin/academies?verificationStatus=PENDING` applies correctly.
3. Confirm table/detail status badge behavior.
4. Add or adjust tests/manual checks for role scope and empty state.
