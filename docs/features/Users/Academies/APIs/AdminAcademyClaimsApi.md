# PRD: Admin Academy Claims API

Version: 1.0

Status: Implemented

Implemented on branch: `master`

Original implementation branch: `feature/academy-claiming-admin-approval`

Proposed route: `GET /api/admin/academy-claims`

Source PRD: `docs/features/Users/Academies/Products/Completed/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow platform admins to list academy claim requests for review.

---

# Query Parameters

Optional:

* `status`
* `page`
* `pageSize`
* `search`

---

# IF/WHEN/THEN Requirements

## CLAIM-LIST-001: Platform Admin Authorization

IF a user calls `GET /api/admin/academy-claims`

WHEN the user lacks platform-level claim review permission

THEN the API SHALL return HTTP 403.

## CLAIM-LIST-002: List Claims

IF a platform admin calls the API

WHEN claim requests exist

THEN the API SHALL return claim rows with academy name, requester name, requester email, requester role, submitted date, and status.

## CLAIM-LIST-003: Status Filter

IF the request includes `status`

WHEN the API queries claims

THEN the API SHALL return only claims matching the requested status.

## CLAIM-LIST-004: Search Filter

IF the request includes `search`

WHEN the API queries claims

THEN the API SHOULD search academy name, requester name, and requester email.

## CLAIM-LIST-005: Pagination

IF claim volume exceeds the requested page size

WHEN the API responds

THEN the API SHALL include pagination metadata.

## CLAIM-LIST-006: Evidence Exclusion

IF the API returns claim list rows

WHEN the response is generated

THEN the API SHALL exclude full verification notes unless needed by the list UI.

## CLAIM-LIST-007: Belt Context Exclusion

IF the API returns claim list rows

WHEN the response is generated

THEN the API SHALL exclude requester belt rank and stripe information from list rows.

Done when:

* Belt rank and stripes are not used for claim list sorting, filtering, badges, or prioritization.
* Admins must open claim detail to view optional BJJ context.
* Claim list rows remain focused on review status, academy, requester, and submitted date.

---

# Acceptance Criteria

* Only platform admins can list claims.
* Claims can be filtered by status.
* List response supports pagination.
* Full private evidence is reserved for detail review.
* Belt rank and stripes are excluded from claim list rows.
