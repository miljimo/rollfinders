# PRD: Admin Academy Claim Reject API

Version: 1.0

Status: Implemented

Implemented on branch: `master`

Original implementation branch: `feature/academy-claiming-admin-approval`

Proposed route: `POST /api/admin/academy-claims/[id]/reject`

Source PRD: `docs/features/Academies/Products/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow platform admins to reject a pending academy claim without granting academy access.

---

# Request Body

Optional:

* `rejectionReason`

---

# IF/WHEN/THEN Requirements

## CLAIM-REJECT-001: Platform Admin Authorization

IF a user calls `POST /api/admin/academy-claims/[id]/reject`

WHEN the user lacks platform-level claim rejection permission

THEN the API SHALL return HTTP 403.

## CLAIM-REJECT-002: Claim Must Exist

IF a platform admin rejects an unknown claim ID

WHEN the API queries the claim

THEN the API SHALL return HTTP 404.

## CLAIM-REJECT-003: Claim Must Be Pending

IF a platform admin rejects a claim that is not `PENDING`

WHEN the API checks the claim status

THEN the API SHALL reject the request.

## CLAIM-REJECT-004: Store Rejection

IF a platform admin rejects a pending claim

WHEN the rejection transaction succeeds

THEN the API SHALL set status to `REJECTED`, store reviewed metadata, and store the rejection reason when provided.

## CLAIM-REJECT-005: No Access Grant

IF a claim is rejected

WHEN the rejection transaction completes

THEN the API SHALL NOT create or update academy membership for the requester.

## CLAIM-REJECT-006: Rejection Email

IF email delivery is available

WHEN rejection succeeds

THEN the API SHALL queue a rejection notification email.

## CLAIM-REJECT-007: Audit Log

IF rejection succeeds

WHEN the decision is saved

THEN the API SHALL write an admin audit log entry with actor, claim, academy, requester, action, and timestamp.

Done when:

* The audit log does not copy requester belt rank or stripes into rejection metadata.

---

# Acceptance Criteria

* Only platform admins can reject claims.
* Only pending claims can be rejected.
* Rejection reason is stored when provided.
* Rejection never grants academy access.
* Rejection notification is queued.
* Rejection is audit logged.
