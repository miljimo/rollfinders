# PRD: Admin Academy Claim Approve API

Version: 1.0

Status: Implemented

Implemented on branch: `master`

Original implementation branch: `feature/academy-claiming-admin-approval`

Proposed route: `POST /api/admin/academy-claims/[id]/approve`

Source PRD: `docs/features/Academies/Products/RollFinderAcademyClaimingPrd.md`

---

# Objective

Allow platform admins to approve a pending academy claim, create or link the requester account, assign `Academy Admin` access, and email initial login details.

---

# IF/WHEN/THEN Requirements

## CLAIM-APPROVE-001: Platform Admin Authorization

IF a user calls `POST /api/admin/academy-claims/[id]/approve`

WHEN the user lacks platform-level claim approval permission

THEN the API SHALL return HTTP 403.

## CLAIM-APPROVE-002: Claim Must Exist

IF a platform admin approves an unknown claim ID

WHEN the API queries the claim

THEN the API SHALL return HTTP 404.

## CLAIM-APPROVE-003: Claim Must Be Pending

IF a platform admin approves a claim that is not `PENDING`

WHEN the API checks the claim status

THEN the API SHALL reject the request.

## CLAIM-APPROVE-004: Transactional Approval

IF a platform admin approves a pending claim

WHEN the approval transaction runs

THEN the API SHALL mark the claim `APPROVED`, store reviewed metadata, and prevent partial access grants.

## CLAIM-APPROVE-005: Create Missing User

IF the requester email does not belong to an existing user

WHEN the claim is approved

THEN the API SHALL create a user account for the requester.

## CLAIM-APPROVE-006: Link Existing User

IF the requester email belongs to an existing user

WHEN the claim is approved

THEN the API SHALL link that user to the claimed academy.

## CLAIM-APPROVE-007: Academy Admin Assignment

IF the requester account exists or is created

WHEN approval succeeds

THEN the API SHALL assign the requester as an `Academy Admin` for the claimed academy through the existing role and academy membership model.

## CLAIM-APPROVE-008: Initial Login Email

IF the claim is approved

WHEN account creation or linking completes

THEN the API SHALL queue an email containing an initial password or secure password setup link.

## CLAIM-APPROVE-009: Audit Log

IF approval succeeds

WHEN the decision is saved

THEN the API SHALL write an admin audit log entry with actor, claim, academy, requester, action, and timestamp.

## CLAIM-APPROVE-009A: Belt Context Is Not Approval Evidence

IF a claim includes requester belt rank or stripe information

WHEN a platform admin approves the claim

THEN the API SHALL grant academy access only when operational academy authority evidence supports approval.

Done when:

* Belt rank and stripes are not required for approval.
* Belt rank and stripes are not sufficient for approval by themselves.
* Approval logic does not treat belt rank or stripes as identity, ownership, or authorization proof.
* The audit log does not copy belt rank or stripes into approval metadata.

## CLAIM-APPROVE-010: Safe Response

IF approval succeeds

WHEN the API responds

THEN the API SHALL return approved claim status and linked user/academy identifiers without returning plaintext passwords.

---

# Acceptance Criteria

* Only platform admins can approve claims.
* Only pending claims can be approved.
* Approval creates or links a user.
* Approved owner becomes `Academy Admin`.
* Initial login email is queued.
* Plaintext password is never returned by the API.
* Approval is audit logged.
* Optional belt rank and stripes are never treated as standalone approval evidence.
