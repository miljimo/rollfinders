# PRD: Academy Verification

Version: 1.0

Priority: High

Review date: 2026-06-05

Branch:

`feature/academy-verification-workflow`

---

# Objective

Provide a clear admin workflow for verifying, rejecting, and displaying academy verification status.

This requirement covers academy verification state transitions and the relationship between `verificationStatus` and the legacy/public `verified` flag.

Verification is a public data-quality signal. It can contribute to discovery ranking, but it is separate from academy ownership or management status.

---

# Current Source Context

Existing model:

* `Academy.verificationStatus`
* `Academy.verified`
* `AcademyVerificationStatus.PENDING`
* `AcademyVerificationStatus.VERIFIED`
* `AcademyVerificationStatus.REJECTED`

Existing UI/actions:

* `src/app/admin/academies/page.tsx`
* `src/app/admin/academies/[id]/page.tsx`
* `src/app/admin/academies/form.tsx`
* `src/app/admin/academies/actions.ts`
* `src/app/api/admin/academies/route.ts`
* `src/app/api/admin/academies/[id]/route.ts`
* `src/app/academies/[slug]/page.tsx`
* `src/components/ui.tsx` `AcademyCard`

Current behavior:

* Admin academy form includes verification status.
* Academy update/create actions set `verified` based on `verificationStatus === VERIFIED`.
* Public academy profile and card can show verified state.

---

# User Story

As an admin, I want to verify or reject academy records so that public users can trust verified academy information.

---

# Scope

In scope:

* Admin verification status display.
* Admin verification status update.
* Verified academy count.
* Pending and rejected state handling.
* Public verified indicator.
* Audit logging for verification changes.

Out of scope:

* External automated verification providers.
* Paid verification subscriptions.
* Public academy reviews.
* Claim request intake.

---

# IF/WHEN/THEN Requirements

## AV-001: Verification Status Options

IF an authorized admin edits an academy

WHEN the academy form renders

THEN the form SHALL allow `PENDING`, `VERIFIED`, and `REJECTED` verification statuses.

Done when:

* Select options map to `AcademyVerificationStatus`.
* Existing form validation accepts only valid enum values.

---

## AV-002: Verify Academy

IF an authorized admin sets verification status to `VERIFIED`

WHEN the academy update succeeds

THEN the system SHALL save `verificationStatus = VERIFIED` and `verified = true`.

Done when:

* Admin table shows Verified status.
* Public academy profile shows verified academy state.
* Academy card shows verified indicator.

---

## AV-003: Reject Academy Verification

IF an authorized admin sets verification status to `REJECTED`

WHEN the academy update succeeds

THEN the system SHALL save `verificationStatus = REJECTED` and `verified = false`.

Done when:

* Admin table shows Rejected status.
* Public UI does not show verified badge.
* Academy remains manageable by authorized admins.

---

## AV-004: Return Academy To Pending

IF an authorized admin sets verification status to `PENDING`

WHEN the academy update succeeds

THEN the system SHALL save `verificationStatus = PENDING` and `verified = false`.

Done when:

* Admin table shows Pending status.
* Pending count includes the academy.
* Public UI does not show verified badge.

---

## AV-005: Verified Metric Count

IF an authorized admin opens `/admin`

WHEN academy records exist with `verificationStatus = VERIFIED`

THEN the dashboard SHALL show the count in a `Verified Academies` metric.

Done when:

* Count uses `verificationStatus = VERIFIED`.
* Academy admins see academy-scoped count.
* Platform-level admins see platform-wide count.

---

## AV-006: Verified Metric Navigation

IF the `Verified Academies` metric is displayed

WHEN the admin clicks or activates it

THEN the UI SHOULD navigate to `/admin/academies?verificationStatus=VERIFIED`.

Done when:

* Navigation applies the verified filter.
* Existing dashboard layout remains intact.

---

## AV-007: Verification Filter

IF an admin opens `/admin/academies`

WHEN the admin selects a verification status filter

THEN the academy table SHALL show only academies matching the selected status.

Done when:

* Filter supports all, verified, pending, and rejected.
* URL query persists the selected value.
* Pagination respects filtered results.

---

## AV-008: Verification Status Badge

IF an academy row has a verification status

WHEN the academy table renders

THEN the Verification Status column SHALL show a readable status badge.

Done when:

* Verified, pending, and rejected states are visually distinguishable.
* Badge text remains readable on mobile/table scroll.

---

## AV-009: Public Verified Profile Label

IF an academy is verified

WHEN the public academy profile renders

THEN the profile SHALL show `Verified academy`.

Done when:

* Label appears only when `verified = true`.
* Non-verified academies show affiliation or fallback academy label.

---

## AV-010: Public Verified Card Indicator

IF an academy is verified

WHEN `AcademyCard` renders

THEN the card SHALL show the verified indicator.

Done when:

* Indicator has accessible label or text equivalent.
* Indicator does not render for pending/rejected academies.

---

## AV-011: Verification Audit Log

IF an admin changes academy verification status

WHEN the update succeeds

THEN the system SHALL write an admin audit log entry for the verification change.

Done when:

* Audit metadata includes academy ID, previous status, next status, actor, and timestamp.
* Audit metadata does not include unrelated academy fields unless necessary.

---

## AV-012: Verified Academy Discovery Weight

IF an academy has `verificationStatus = VERIFIED`

WHEN public discovery ranking is calculated

THEN the academy SHALL receive verified ranking weight without implying ownership unless it is also managed through approved claim or owner/admin membership.

Done when:

* Verified and managed academies receive the highest trust ranking tier.
* Managed but unverified academies receive managed ranking weight without a verified badge.
* Verified but unmanaged academies receive verified ranking weight below verified-and-managed listings.
* Pending or rejected academies do not receive verified ranking weight.
* Existing relevance rules such as search relevance, date/time, distance, featured state, and deterministic name fallback still apply.
* Distance-aware card grids preserve closest-first visible ordering after verified/managed top-list candidate priority is applied.

---

## AV-013: Unauthorized Verification Change

IF a user without verification permission attempts to change academy verification status

WHEN the backend receives the request

THEN the system SHALL reject the request.

Done when:

* Academy admins cannot verify unrelated academies.
* Platform/super admin permissions follow existing role policy.
* Backend enforces permission even if UI controls are hidden.

---

# Acceptance Criteria

* Admins can set academy verification status to pending, verified, or rejected.
* `verified` flag remains consistent with `verificationStatus`.
* Verified and pending dashboard counts are accurate.
* Academy management filters by verification status.
* Public verified indicators display only for verified academies.
* Verified academies receive discovery candidate-selection weight without implying ownership unless they are also managed.
* Verification changes are audited.
* Unauthorized verification changes are rejected.

---

# Implementation Notes

Suggested small implementation path:

1. Confirm form enum values and backend status-to-verified mapping.
2. Make Verified Academies metric clickable to filtered academy list.
3. Add audit metadata specifically for verification status changes.
4. Verify public profile/card verified display.
5. Add role and regression checks.
