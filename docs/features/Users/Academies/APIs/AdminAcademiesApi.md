# PRD: Admin Academies API

Version: 1.0

Route: `GET|POST /api/admin/academies`

Related route for claim reminders: `POST /api/admin/academies/claim-reminders`

Source: `src/app/api/admin/academies/route.ts`

---

# Objective

Support admin academy listing and super-admin academy creation while preserving role-scoped visibility.

---

# IF/WHEN/THEN Requirements

## ADMIN-ACADEMIES-001: Admin Authorization

IF a user calls `GET /api/admin/academies`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## ADMIN-ACADEMIES-002: List Academies

IF an authorized admin calls `GET /api/admin/academies`

WHEN academy records exist

THEN the API SHALL return academies with pagination metadata.

## ADMIN-ACADEMIES-003: List Filters

IF the request includes search or verification query parameters

WHEN the API queries academies

THEN the API SHALL apply the existing search, filter, pagination, and role-scope rules.

## ADMIN-ACADEMIES-003A: Claim Reminder List Filters

IF the request includes claim reminder filter query parameters

WHEN the API queries academies

THEN the API SHALL support filtering by claim status, email status, and reminder status without removing existing search, verification, pagination, and role-scope behavior.

## ADMIN-ACADEMIES-003B: Search With Claim Reminder Filters

IF a request includes both a search query and claim reminder filters

WHEN the API queries academies

THEN the API SHALL apply the search query and claim reminder filters together.

## ADMIN-ACADEMIES-004: Create Requires Super Admin

IF a user calls `POST /api/admin/academies`

WHEN the user is not a super admin

THEN the API SHALL reject the create request.

## ADMIN-ACADEMIES-005: Create Validation

IF a super admin submits invalid academy data

WHEN the API validates the payload

THEN the API SHALL return HTTP 400 with an invalid academy error.

## ADMIN-ACADEMIES-006: Duplicate Academy

IF a super admin submits an academy with an existing name, address, and postcode combination

WHEN the API checks uniqueness

THEN the API SHALL return HTTP 409.

## ADMIN-ACADEMIES-007: Create Success

IF a super admin submits valid unique academy data

WHEN the academy is created

THEN the API SHALL redirect to `/admin/academies` using HTTP 303.

## ADMIN-ACADEMIES-008: Claim Reminder Authorization

IF a user calls `POST /api/admin/academies/claim-reminders`

WHEN the user lacks platform-admin permission to send academy claim reminders

THEN the API SHALL reject the request with an authorization error.

## ADMIN-ACADEMIES-009: Claim Reminder Eligibility

IF an authorized user requests claim reminders for one or more academy IDs

WHEN the API evaluates the academies

THEN the API SHALL re-check each academy server-side for unclaimed status, usable email, suppression state, cooldown state, and current management status before queueing any reminder.

## ADMIN-ACADEMIES-010: Claim Reminder Skip Reasons

IF an academy is not eligible for a claim reminder

WHEN the API returns the reminder response

THEN the API SHALL include a structured skip reason such as `claimed`, `managed`, `pending_claim`, `missing_email`, `invalid_email`, `suppressed_email`, `recently_sent`, `rate_limited`, `unauthorized`, or `not_found`.

## ADMIN-ACADEMIES-010A: Pending Claim Skip

IF an academy has a pending claim request and no approved claim

WHEN claim reminder eligibility is evaluated

THEN the API SHALL skip the academy with `pending_claim`.

## ADMIN-ACADEMIES-011: Claim Reminder Idempotency

IF the same reminder request is submitted more than once with the same idempotency key

WHEN the API processes the repeated request

THEN the API SHALL NOT queue duplicate reminder emails for the same academy and idempotency key.

## ADMIN-ACADEMIES-012: Claim Reminder Cooldown

IF an academy has already received a claim reminder within the configured cooldown window

WHEN another reminder is requested

THEN the API SHALL skip that academy with `recently_sent`.

The MVP cooldown window is 7 days, allowing at least one reminder per week.

## ADMIN-ACADEMIES-013: Claim Reminder Batch Limit

IF a claim reminder request contains more academy IDs than the configured batch size

WHEN the API validates the request

THEN the API SHALL reject or truncate the request according to the configured product policy and SHALL NOT silently send an unbounded batch.

The MVP batch size is 50 academy IDs, and the Admin Academies UI sends current-page selected academies only.

## ADMIN-ACADEMIES-014: Claim Reminder Queueing

IF an academy is eligible for a claim reminder

WHEN the API processes the request

THEN the API SHALL queue the email through the existing reliable email system and return a queued outcome rather than claiming provider delivery.

## ADMIN-ACADEMIES-015: Claim Reminder Audit

IF a claim reminder request is processed

WHEN an academy is queued, skipped, or failed

THEN the API SHALL write audit metadata containing actor, academy ID, recipient email when available, outcome, reason, source, idempotency key, and timestamp.

## ADMIN-ACADEMIES-016: No Claim State Mutation

IF a claim reminder is queued or sent

WHEN the API writes related records

THEN the API SHALL NOT mark the academy as claimed, create an approved claim, or grant management access.

---

# Acceptance Criteria

* Academy lists are role scoped.
* Create is super-admin only.
* Invalid data returns HTTP 400.
* Duplicates return HTTP 409.
* Successful form-style creation redirects to the admin academy list.
* Existing academy search continues to work when claim reminder filters are added.
* Claim reminder requests are authorized server-side.
* Claim reminder eligibility is enforced server-side for every academy ID.
* Duplicate reminder submissions do not queue duplicate emails.
* Bulk reminder responses distinguish queued, skipped, and failed outcomes.
* Reminder sending does not change academy claim or management state.
