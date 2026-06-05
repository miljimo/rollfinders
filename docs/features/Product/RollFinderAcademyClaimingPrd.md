# PRD: Academy Claiming

Version: 1.0

Priority: Critical

Source Requirement: `docs/features/Product/RollFinderMissingMvpRequirementsPrd.md` MR-001

Review date: 2026-06-04

---

# Implementation Branch

Use branch:

`feature/mvp-academy-claiming-flow`

---

# User Story

As an academy owner, I want to claim my academy profile so that I can keep academy and open mat information accurate.

---

# Scope

In scope:

* Public "Claim Profile" action on academy profiles.
* Claim form for requester details and verification evidence.
* Pending claim storage.
* Admin claim list and detail review.
* Claim approve/reject actions.
* Approved owner account creation or linking.
* Academy access assignment through the existing role/membership model.
* Approval and rejection notifications.
* Audit logging.
* Analytics events for claim start and submission.

Out of scope:

* Paid claiming.
* Subscription billing.
* Replacing academy team invitations.
* Replacing existing admin academy edit screens.
* Reviews, ratings, comments, or social features.
* External automated business verification.

---

# Existing Flow Constraint

Claiming must be additive. It must preserve:

* Public `/academies` browsing.
* Public `/academies/[slug]` profiles.
* Public open mat browsing and detail pages.
* Existing `/admin` navigation.
* Existing `/admin/academies` flow.
* Existing `/admin/open-mats` flow.
* Existing `/admin/users` flow.
* Existing academy team/invitation flow.
* Existing role-based access boundaries.

---

# Data Requirements

Reuse existing models where possible:

* `ClaimRequest`
* `ClaimStatus`
* `Academy`
* `User`
* `AcademyMember`
* `AdminAuditLog`
* Existing outbound email models

Claim requests must support:

* Academy ID
* Requester name
* Requester email
* Verification notes or evidence
* Status
* Created date
* Reviewed date
* Reviewed by admin ID
* Rejection reason, if provided

---

# IF/WHEN/THEN Requirements

## Requirement 1: Public Claim Action

IF a public user views an academy profile

WHEN the academy profile renders

THEN the system SHALL display a "Claim Profile" action without removing or obscuring directions, academy details, or upcoming open mats.

---

## Requirement 2: Claim Form Opens

IF a public user selects "Claim Profile"

WHEN the action is activated

THEN the system SHALL open a claim form or claim page with the academy preselected.

---

## Requirement 3: Claim Form Validation

IF a requester submits the claim form

WHEN required fields are missing or invalid

THEN the system SHALL reject the submission and show validation errors.

Acceptance criteria:

* Requester name is required.
* Requester email is required and must be valid.
* Academy is required.
* Verification notes or evidence are required.

---

## Requirement 4: Pending Claim Creation

IF a requester submits a valid claim form

WHEN the submission is accepted

THEN the system SHALL create a claim request with `PENDING` status.

Acceptance criteria:

* Claim stores academy, requester name, requester email, verification evidence/notes, status, and created date.
* Duplicate pending claims for the same academy and requester are prevented or clearly handled.

---

## Requirement 5: Claim Submission Confirmation

IF a claim request is created

WHEN the requester returns to the UI

THEN the system SHALL show confirmation that the claim is awaiting admin review.

---

## Requirement 6: Claim Started Analytics

IF a requester starts the claim flow

WHEN the claim form opens

THEN the system SHALL track `claim_profile_started` without sending requester name, email, or verification evidence.

---

## Requirement 7: Claim Submitted Analytics

IF a claim request is created

WHEN analytics tracking is available

THEN the system SHALL track `claim_profile_submitted` without sending requester name, email, or verification evidence.

---

## Requirement 8: Admin Claim List

IF an authorized platform-level admin opens claim management

WHEN pending claims exist

THEN the system SHALL show a claim list with academy name, requester name, requester email, submitted date, and status.

---

## Requirement 9: Claim Status Filter

IF an authorized platform-level admin opens the claim list

WHEN the admin filters by status

THEN the system SHALL show claims matching the selected status.

---

## Requirement 10: Claim Detail

IF an authorized platform-level admin opens a claim

WHEN the claim detail renders

THEN the system SHALL show academy details, requester details, verification notes/evidence, current status, and submitted date.

---

## Requirement 11: Approve Pending Claim

IF an authorized platform-level admin approves a pending claim

WHEN the approval succeeds

THEN the system SHALL set the claim status to `APPROVED`.

---

## Requirement 12: Approved Owner Account

IF an approved claim requester does not already have a user account

WHEN the claim is approved

THEN the system SHALL create a user account for the requester or start the existing account setup flow.

---

## Requirement 13: Existing Owner Account

IF an approved claim requester already has a user account

WHEN the claim is approved

THEN the system SHALL link the existing user account to the claimed academy.

---

## Requirement 14: Academy Access Assignment

IF a claim is approved

WHEN the requester account exists or is linked

THEN the system SHALL grant academy access through the existing role and `AcademyMember` model.

Acceptance criteria:

* Approved owner can access the claimed academy through the existing admin dashboard.
* Approved owner can update the claimed academy through existing academy management screens.
* Approved owner can add or edit open mats through existing open mat management screens.
* Approved owner cannot manage unrelated academies.

---

## Requirement 15: Approval Notification

IF a claim is approved

WHEN approval processing completes

THEN the system SHALL notify the requester using the existing email delivery system.

---

## Requirement 16: Reject Pending Claim

IF an authorized platform-level admin rejects a pending claim

WHEN rejection succeeds

THEN the system SHALL set the claim status to `REJECTED` and SHALL NOT grant academy access.

---

## Requirement 17: Rejection Reason

IF an admin rejects a claim

WHEN a rejection reason is provided

THEN the system SHALL store the reason according to the claim data model.

---

## Requirement 18: Rejection Notification

IF a claim is rejected

WHEN rejection processing completes

THEN the system SHALL notify the requester using the existing email delivery system.

---

## Requirement 19: Claim Audit Logging

IF a claim is approved or rejected

WHEN the decision is saved

THEN the system SHALL create an admin audit log entry with actor, claim, academy, requester, action, and timestamp.

Acceptance criteria:

* Audit logs do not expose sensitive verification evidence unnecessarily.
* Audit logs do not grant access by themselves.

---

## Requirement 20: Unauthorized Claim Review

IF a user without platform-level claim review permission attempts to view, approve, or reject claims

WHEN the request reaches the backend

THEN the system SHALL reject the request.

---

# Launch Checklist

* Public claim action exists on academy profiles.
* Valid claim submissions create `PENDING` requests.
* Admins can list and inspect claims.
* Admins can approve claims.
* Admins can reject claims.
* Approved owners can use existing academy and open mat admin flows.
* Approval and rejection emails are queued.
* Claim decisions are audit logged.
* Existing public and admin flows still work.

---

# Open Questions

* Should claim submission require account creation first, or only after approval?
* Should verification evidence be free text, file upload, social link, website email-domain check, or a combination?
* Should only platform-level admins review claims, or can academy admins review claims for their own academy?
* Should an approved claim automatically mark the academy as verified?
