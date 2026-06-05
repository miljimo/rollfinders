# PRD: Public Academy Claims API

Version: 1.0

Proposed route: `POST /api/academy-claims`

Source PRD: `docs/features/Product/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow a public requester to submit a claim for an unclaimed academy listing without receiving immediate academy access.

---

# Request Body

Required:

* `academyId`
* `requesterName`
* `requesterEmail`
* `requesterRole`
* `verificationNotes`

Optional:

* `requesterPhone`
* `publicProofLink`

---

# IF/WHEN/THEN Requirements

## CLAIM-PUBLIC-001: Public Submission

IF a requester submits `POST /api/academy-claims`

WHEN the payload is valid

THEN the API SHALL create a `ClaimRequest` with `PENDING` status.

## CLAIM-PUBLIC-002: Required Field Validation

IF a requester submits missing or invalid required fields

WHEN the API validates the payload

THEN the API SHALL return HTTP 400 with validation errors.

## CLAIM-PUBLIC-003: Academy Must Exist

IF a requester submits a claim for an unknown academy ID

WHEN the API checks the academy record

THEN the API SHALL return HTTP 404 or HTTP 400 with a clear academy error.

## CLAIM-PUBLIC-004: Already Managed Academy

IF a requester submits a claim for an academy that already has an approved owner or academy admin

WHEN the API checks existing academy ownership

THEN the API SHALL reject the claim unless additional owner requests are explicitly enabled.

## CLAIM-PUBLIC-005: Duplicate Pending Claim

IF the same requester email already has a pending claim for the same academy

WHEN the API checks existing claims

THEN the API SHALL avoid creating a duplicate and return the existing pending state or HTTP 409.

## CLAIM-PUBLIC-006: No Immediate Access

IF a pending claim is created

WHEN the API transaction completes

THEN the API SHALL NOT create academy membership or admin access.

## CLAIM-PUBLIC-007: Submission Email

IF email delivery is available

WHEN a pending claim is created

THEN the API SHOULD queue a claim submission confirmation email.

## CLAIM-PUBLIC-008: Privacy-Safe Response

IF a pending claim is created

WHEN the API responds

THEN the API SHALL return safe claim status data without exposing internal admin notes.

---

# Acceptance Criteria

* Public users can submit valid claims.
* Invalid claims return HTTP 400.
* Unknown academy claims are rejected.
* Duplicate pending claims are handled.
* Pending claims do not grant access.
* Submission confirmation email is queued when available.
