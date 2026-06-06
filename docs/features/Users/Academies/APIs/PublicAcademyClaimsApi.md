# PRD: Public Academy Claims API

Version: 1.0

Status: Implemented

Implemented on branch: `master`

Original implementation branch: `feature/academy-claiming-admin-approval`

Proposed route: `POST /api/academy-claims`

Source PRD: `docs/features/Users/Academies/Products/Completed/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow a public requester to submit a claim for an existing unclaimed academy listing without login and without receiving immediate academy access.

The endpoint is public intake only. Admin review, approval, rejection, user creation, initial password email, and academy admin assignment are handled by separate admin claim APIs.

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
* `requesterBeltRank`
* `requesterBeltStripes`

Contract:

```ts
type PublicAcademyClaimRequest = {
  academyId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: "OWNER" | "HEAD_COACH" | "MANAGER" | "STAFF" | "OTHER";
  verificationNotes: string;
  requesterPhone?: string;
  publicProofLink?: string;
  requesterBeltRank?: "WHITE" | "BLUE" | "PURPLE" | "BROWN" | "BLACK" | "CORAL" | "RED" | "OTHER";
  requesterBeltStripes?: 0 | 1 | 2 | 3 | 4;
};
```

---

# Response Body

Success response:

```json
{
  "claim": {
    "id": "claim_id",
    "academyId": "academy_id",
    "status": "PENDING",
    "createdAt": "2026-06-05T12:00:00.000Z"
  }
}
```

The success response SHALL NOT include requester phone, requester belt rank, requester belt stripes, verification notes, public proof link, admin notes, user existence, reviewed metadata, or internal review data.

---

# Validation Rules

* `academyId` is required and must reference an existing academy.
* `requesterName` is required, trimmed before validation, and must be 2-120 characters.
* `requesterEmail` is required, trimmed before validation, lowercased before storage, must be a valid email, and must be 160 characters or fewer.
* `requesterRole` is required and must be a claim-specific role value: `OWNER`, `HEAD_COACH`, `MANAGER`, `STAFF`, or `OTHER`.
* `requesterRole` SHALL NOT reuse `AcademyMemberRole`, because academy membership roles do not describe the claimant's real-world relationship to the academy.
* `verificationNotes` is required, trimmed before validation, and must be 20-2000 characters.
* `requesterPhone` is optional, trimmed before storage, must be 40 characters or fewer, and empty strings are stored as `null`.
* `publicProofLink` is optional, trimmed before storage, must be an `http://` or `https://` URL when provided, and empty strings are stored as `null`.
* `requesterBeltRank` is optional and, when provided, must be one of `WHITE`, `BLUE`, `PURPLE`, `BROWN`, `BLACK`, `CORAL`, `RED`, or `OTHER`.
* `requesterBeltStripes` is optional and, when provided, must be an integer from 0 to 4.
* `requesterBeltStripes` SHALL be rejected when `requesterBeltRank` is missing.
* `requesterBeltStripes` SHALL be accepted only for `WHITE`, `BLUE`, `PURPLE`, and `BROWN`.
* `requesterBeltStripes` SHALL be rejected for `BLACK`, `CORAL`, `RED`, and `OTHER`.
* Belt rank and stripes are context for admin review only and SHALL NOT be required to submit a claim.
* Belt rank and stripes are self-attested and SHALL NOT be treated as proof of academy ownership, identity verification, coaching authority, or approval eligibility.
* Oversized request bodies SHOULD be rejected before parsing where practical.

---

# IF/WHEN/THEN Requirements

## CLAIM-PUBLIC-001: Public Submission

IF a requester submits `POST /api/academy-claims`

WHEN the payload is valid

THEN the API SHALL create a `ClaimRequest` with `PENDING` status.

Done when:

* The claim stores academy ID, requester name, normalized requester email, requester role, verification notes, optional requester phone, optional public proof link, optional requester belt rank, optional requester belt stripes, status, and created date.
* The response returns only safe claim status data.

---

## CLAIM-PUBLIC-002: Required Field Validation

IF a requester submits missing or invalid required fields

WHEN the API validates the payload

THEN the API SHALL return HTTP 400 with stable field validation errors.

Example:

```json
{
  "error": "Validation failed",
  "fieldErrors": {
    "requesterEmail": ["Valid email is required"]
  }
}
```

---

## CLAIM-PUBLIC-002A: Optional Belt Context

IF a requester omits `requesterBeltRank` and `requesterBeltStripes`

WHEN the API validates the claim request

THEN the API SHALL accept the claim if all required fields and evidence are valid.

Done when:

* Belt rank is never required.
* Stripe count is never required.
* Missing belt data does not change the claim status, approval path, or response body.

---

## CLAIM-PUBLIC-002B: Belt Stripe Dependency

IF `requesterBeltStripes` is provided

WHEN `requesterBeltRank` is missing

THEN the API SHALL return HTTP 400 with a stable field validation error.

Done when:

* Stripe count cannot be submitted without belt rank.
* The error explains that stripes require a belt rank.

---

## CLAIM-PUBLIC-002C: Belt Stripe Rank Rules

IF `requesterBeltRank` is provided

WHEN `requesterBeltStripes` is also provided

THEN the API SHALL validate whether stripes are meaningful for the selected rank.

Done when:

* `WHITE`, `BLUE`, `PURPLE`, and `BROWN` accept stripe counts from 0 to 4.
* `BLACK`, `CORAL`, `RED`, and `OTHER` reject stripe counts.
* Black belt degrees are not accepted through `requesterBeltStripes`.

---

## CLAIM-PUBLIC-002D: Belt Context Privacy

IF belt rank or stripe data is submitted

WHEN the API returns public responses, emits analytics, writes audit metadata, writes application logs, queues public/requester emails, or serializes claim data for non-admin contexts

THEN the API SHALL exclude requester belt rank and stripe information.

Done when:

* The public success response never includes belt rank or stripes.
* Analytics never include belt rank or stripes.
* Requester/admin notification emails do not include belt rank or stripes unless a future admin-only review email requirement explicitly allows it.
* Belt data is available only to authorized platform admins reviewing claim details.

---

## CLAIM-PUBLIC-003: Academy Must Exist

IF a requester submits a claim for an unknown academy ID

WHEN the API checks the academy record

THEN the API SHALL return HTTP 404.

---

## CLAIM-PUBLIC-004: Already Managed Academy

IF a requester submits a claim for an academy that already has an academy member

WHEN the API checks existing academy ownership

THEN the API SHALL return HTTP 409.

Done when:

* V1 treats any existing `AcademyMember` as evidence that the academy is already managed.
* The API does not create an additional owner claim for already managed academies.
* Future non-admin academy member roles, if added, SHALL narrow this check to owner/admin roles.

---

## CLAIM-PUBLIC-005: Duplicate Pending Claim

IF the same normalized requester email already has a pending claim for the same academy

WHEN the API checks existing claims

THEN the API SHALL return HTTP 409 and SHALL NOT create another pending claim.

Done when:

* Duplicate detection compares lowercased requester email.
* Implementation includes an app-level duplicate check.
* Implementation SHOULD include a database-level guard where supported, for example a partial unique index on academy ID and lowercased requester email for pending claims.

---

## CLAIM-PUBLIC-006: No Immediate Access

IF a pending claim is created

WHEN the API transaction completes

THEN the API SHALL NOT create user accounts, create academy membership, grant admin access, update academy details, or mark the academy verified.

---

## CLAIM-PUBLIC-007: Submission Email

IF email delivery is available

WHEN a pending claim is created

THEN the API SHOULD queue a claim submission confirmation email.

Done when:

* Claim creation succeeds even if confirmation email queueing fails.
* Email failure is logged or surfaced through existing operational visibility where practical.
* Email content does not include internal admin review data.

---

## CLAIM-PUBLIC-008: Privacy-Safe Response

IF a pending claim is created

WHEN the API responds

THEN the API SHALL return safe claim status data without exposing personal details, evidence, internal review data, or whether the requester email belongs to an existing user.

---

## CLAIM-PUBLIC-009: Analytics

IF analytics tracking is available

WHEN the claim is successfully stored

THEN the API SHOULD track `claim_profile_submitted`.

Done when:

* Analytics payload may include academy ID and claim status.
* Analytics payload SHALL NOT include requester name, requester email, requester phone, requester belt rank, requester belt stripes, verification notes, public proof link, or exact user location.
* Analytics failures do not roll back claim creation.

---

## CLAIM-PUBLIC-010: Abuse Protection

IF the public endpoint receives repeated or suspicious submissions

WHEN rate limiting or abuse controls are available

THEN the API SHOULD limit requests by IP address and/or requester email.

Done when:

* Rate-limited requests return HTTP 429.
* The API does not reveal whether a requester email belongs to an existing user.
* Oversized or malformed payloads are rejected safely.

---

# Error Responses

Status codes:

* `400`: invalid JSON, unsupported content, oversized payload, or field validation failure.
* `404`: academy not found.
* `409`: academy already managed.
* `409`: duplicate pending claim for the same academy and normalized requester email.
* `429`: rate limit exceeded, when rate limiting is available.
* `500`: unexpected server error without stack traces or sensitive details.

---

# Data Model Requirements

`ClaimRequest` must support public intake fields before this API can be implemented:

* Academy ID
* Requester name
* Requester email
* Requester role
* Verification notes or evidence
* Requester phone, optional
* Public proof link, optional
* Requester BJJ belt rank, optional
* Requester BJJ belt stripes, optional
* Status
* Created date

The requester role should be a claim-specific enum or constrained string field, not `AcademyMemberRole`.

Admin review fields may be added in the same migration if the admin claim APIs are implemented in the same release:

* Reviewed date
* Reviewed by admin ID
* Rejection reason
* Linked user ID

---

# Acceptance Criteria

* Public users can submit valid claims without logging in.
* Valid submissions create one `PENDING` claim.
* Invalid claims return HTTP 400 with field errors.
* Unknown academy claims return HTTP 404.
* Claims for already managed academies return HTTP 409.
* Duplicate pending claims return HTTP 409.
* Pending claims do not grant access or update academy records.
* Optional phone and proof link are stored only when provided.
* Submission confirmation email is queued when available and does not block claim creation.
* Analytics event is privacy-safe and does not block claim creation.
* API responses do not expose sensitive claim evidence or user existence.
