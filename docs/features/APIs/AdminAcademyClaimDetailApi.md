# PRD: Admin Academy Claim Detail API

Version: 1.0

Proposed route: `GET /api/admin/academy-claims/[id]`

Source PRD: `docs/features/Product/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow platform admins to inspect the full details and evidence for a single academy claim.

---

# IF/WHEN/THEN Requirements

## CLAIM-DETAIL-001: Platform Admin Authorization

IF a user calls `GET /api/admin/academy-claims/[id]`

WHEN the user lacks platform-level claim review permission

THEN the API SHALL return HTTP 403.

## CLAIM-DETAIL-002: Claim Not Found

IF a platform admin requests an unknown claim ID

WHEN the API queries the claim

THEN the API SHALL return HTTP 404.

## CLAIM-DETAIL-003: Detail Response

IF a platform admin requests an existing claim

WHEN the API responds

THEN the API SHALL return claim details, academy details, requester details, verification evidence, status, created date, reviewed date, and reviewing admin where available.

## CLAIM-DETAIL-004: Sensitive Data Scope

IF the claim contains verification notes, phone number, or proof links

WHEN the API responds

THEN the API SHALL expose that data only to authorized platform admins.

## CLAIM-DETAIL-005: Reviewed Claim State

IF the claim has already been approved or rejected

WHEN the API responds

THEN the API SHALL include reviewed metadata and decision status.

---

# Acceptance Criteria

* Unauthorized users cannot inspect claim details.
* Unknown claims return HTTP 404.
* Authorized admins receive enough data to approve or reject.
* Private evidence is not exposed publicly.
