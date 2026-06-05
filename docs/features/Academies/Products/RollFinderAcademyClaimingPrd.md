# PRD: Academy Claiming And Admin Approval

Version: 1.0

Status: Implemented

Priority: Critical

Release: Next beta feature

Review date: 2026-06-05

Source Requirement: RollFinders MVP academy owner onboarding

---

# Implementation Status

Implemented on branch:

`master`

Original implementation branch:

`feature/academy-claiming-admin-approval`

---

# Objective

Allow academy owners to claim an existing public academy listing and allow platform admins to approve or reject that claim before the owner receives academy management access.

This feature supports the beta release model where RollFinders may contain publicly available academy listings before every owner has joined the platform.

---

# Product Context

RollFinders is launching with academy listings created from public business information. Some listings may be unclaimed at beta launch.

The claiming feature must convert an unclaimed public listing into an owner-managed academy without weakening platform data quality or giving unauthorized users control of academy records.

The intended flow is:

1. A user views an academy profile.
2. The academy profile shows a clear `Claim this academy` action when the academy is not already owner-managed.
3. The requester submits ownership/contact evidence.
4. The claim enters `PENDING` status.
5. A platform admin reviews the claim.
6. The admin approves or rejects the claim.
7. If approved, the requester is linked to the academy as an `Academy Admin` and can manage the academy through the existing admin dashboard.
8. The approved owner receives an email with their initial password or secure setup instructions so they can log in.

---

# User Stories

As an academy owner, I want to claim my academy listing so that I can keep my academy details and open mat information accurate.

As a platform admin, I want to review academy claims before granting access so that RollFinders does not hand academy control to the wrong person.

As a practitioner, I want academy information to be accurate and clearly managed by the right people so that I can trust the listing.

---

# Scope

In scope:

* Public claim action on unclaimed academy profiles.
* Claim request form for academy owners or authorized staff.
* Claim request validation and duplicate handling.
* Pending claim storage.
* Admin claim list.
* Admin claim detail view.
* Admin approve action.
* Admin reject action.
* Approved owner account creation or account linking.
* Academy access assignment using the existing role and academy membership model.
* Claim status display for admins.
* Owner notifications for submitted, approved, and rejected claims.
* Admin audit logging.
* Basic analytics events that avoid personal or sensitive claim evidence.

Out of scope:

* Paid claiming.
* Subscription billing.
* Automated external company verification.
* Public reviews or ratings.
* Replacing the existing admin-created academy flow.
* Replacing existing academy team invitations.
* Letting academy owners approve other claims.
* Publicly displaying private claim evidence.
* Allowing a claim to overwrite academy details automatically before admin approval.

---

# Existing Flow Constraints

Claiming must be additive. It must preserve:

* Public `/academies` browsing.
* Public `/academies/[slug]` profiles.
* Public open mat browsing and detail pages.
* Existing `/admin` navigation.
* Existing `/admin/academies` flow.
* Existing `/admin/open-mats` flow.
* Existing `/admin/users` flow.
* Existing academy team and invitation flow.
* Existing role-based access boundaries.
* Existing academy verification workflow.

---

# Roles And Permissions

## Public Visitor

Can:

* View academy profiles.
* Start a claim for an unclaimed academy.
* Submit claim details.

Cannot:

* Access admin claim review.
* Approve or reject claims.
* Edit academy data through claim submission alone.

## Claim Requester

Can:

* Submit a claim.
* Receive claim status notifications.
* Become an academy owner/admin after approval.

Cannot:

* Manage the academy until the claim is approved.
* See other claim requests.
* Approve their own claim.

## Platform Admin

Can:

* View all claim requests.
* Filter claims by status.
* Inspect claim evidence.
* Approve claims.
* Reject claims.
* Link the requester to the claimed academy.

## Academy Admin

Can:

* Manage academies they already have access to.

Cannot:

* Review platform claim requests unless they also hold a platform-level admin role.

---

# Data Requirements

Reuse existing models where possible:

* `ClaimRequest`
* `ClaimStatus`
* `Academy`
* `User`
* `AcademyMember`
* `AdminAuditLog`
* Existing outbound email models or email helper functions

Claim requests must support:

* Claim ID
* Academy ID
* Requester name
* Requester email
* Requester phone, optional
* Requester role at academy: `OWNER`, `HEAD_COACH`, `MANAGER`, `STAFF`, or `OTHER`
* Requester BJJ belt rank, optional
* Requester BJJ belt stripes, optional
* Verification notes or evidence
* Public proof link, optional
* Status: `PENDING`, `APPROVED`, `REJECTED`
* Created date
* Reviewed date
* Reviewed by admin ID
* Rejection reason, optional
* Linked user ID, optional

Requester role should be stored as a claim-specific role value and SHALL NOT reuse `AcademyMemberRole`, because academy membership roles describe platform access rather than the claimant's real-world relationship to the academy.

BJJ belt rank and stripes are optional, self-attested context for admin review only. They can help RollFinders understand who is contacting the platform, but they SHALL NOT be treated as proof of academy ownership, identity verification, coaching authority, or approval eligibility.

Academies should support determining whether the listing is already claimed or owner-managed. For V1 this can be derived from existing `AcademyMember` records because current academy members are owner/admin managers. If future non-admin academy member roles are added, managed-academy checks must narrow to owner/admin roles.

---

# IF/WHEN/THEN Requirements

## AC-001: Public Claim Action

IF a public user views an academy profile

WHEN the academy does not already have an approved owner or academy admin membership

THEN the system SHALL display a `Claim this academy` action.

Done when:

* The action appears on public academy detail pages.
* The action does not obscure core academy details, directions, or open mat information.
* The action is not shown for academies already managed by an approved owner unless the product explicitly supports additional owner requests.

---

## AC-002: Claimed Academy Public State

IF a public user views an academy that already has an approved owner or academy admin

WHEN the academy profile renders

THEN the system SHOULD show a non-intrusive managed or verified ownership state instead of the primary claim action.

Done when:

* The page avoids encouraging duplicate ownership claims.
* The UI does not imply that RollFinders has verified the academy unless the academy verification status is verified.

---

## AC-003: Claim Form Opens With Academy Context

IF a user selects `Claim this academy`

WHEN the claim flow opens

THEN the system SHALL open a claim form with the academy preselected.

Done when:

* Academy name is visible on the claim form.
* Requester cannot accidentally submit for a different academy from the profile context.
* Public users can submit without needing to create an account first.

---

## AC-004: Claim Form Required Fields

IF a requester submits a claim

WHEN required fields are missing or invalid

THEN the system SHALL reject the submission and show clear validation errors.

Done when:

* Requester name is required.
* Requester email is required and must be valid.
* Academy ID is required.
* Requester role is required.
* Requester role accepts `OWNER`, `HEAD_COACH`, `MANAGER`, `STAFF`, or `OTHER`.
* Verification notes or evidence are required and must be long enough for admin review.
* Optional phone number, if provided, is stored safely.
* Optional BJJ belt rank and stripe count, if provided, are stored safely and shown only to admins reviewing the claim.

---

## AC-004A: Optional BJJ Rank Context

IF a requester submits a claim without BJJ belt rank or stripe information

WHEN all required claim fields and ownership evidence are valid

THEN the system SHALL accept the claim.

Done when:

* Belt rank is not required to submit a claim.
* Stripe count is not required to submit a claim.
* The claim form copy makes clear that belt information is optional and used only as context.
* A missing belt rank or stripe count does not reduce claim validity by itself.

---

## AC-004B: BJJ Rank Validation

IF a requester provides BJJ belt information

WHEN the claim form or API validates the submission

THEN the system SHALL validate the rank and stripe fields without making them required.

Done when:

* Accepted belt ranks are `WHITE`, `BLUE`, `PURPLE`, `BROWN`, `BLACK`, `CORAL`, `RED`, and `OTHER`.
* Stripe count is accepted only when a belt rank is provided.
* Stripe count is accepted only for `WHITE`, `BLUE`, `PURPLE`, and `BROWN`.
* Stripe count is rejected for `BLACK`, `CORAL`, `RED`, and `OTHER`.
* Stripe count, when accepted, must be an integer from 0 to 4.
* Black belt degree is not overloaded into the stripe field; a separate future field would be required if black belt degrees are needed.

---

## AC-004C: BJJ Rank Admin Review Context

IF a claim includes BJJ belt rank or stripe information

WHEN a platform admin reviews the claim

THEN the system SHALL present the information as self-attested BJJ context, not as verified authority evidence.

Done when:

* Admin-facing labels use wording such as `BJJ context` or `Self-attested belt rank`.
* Belt rank and stripes are visible only to authorized platform admins in claim review contexts.
* Claim list views exclude belt rank and stripes unless a specific admin-review requirement adds them.
* Claim approval guidance states that ownership decisions must be based on operational authority evidence, not belt rank alone.

---

## AC-004D: BJJ Rank Privacy Boundaries

IF claim data is exposed outside authorized admin claim review

WHEN public responses, public pages, emails, analytics events, audit logs, application logs, exports, search indexes, badges, user profiles, or academy profiles are generated

THEN the system SHALL exclude requester belt rank and stripe information unless a future explicit consent-based requirement allows it.

Done when:

* Public academy pages never display claim-request belt data.
* Public API responses never return claim-request belt data.
* Analytics events exclude belt rank and stripes.
* Notification emails exclude belt rank and stripes.
* Audit logs record claim actions without copying belt rank and stripes into metadata.
* Future practitioner profiles do not auto-populate from claim-request belt data.

---

## AC-005: Claim Evidence Guidance

IF the claim form asks for verification evidence

WHEN the requester reads the form

THEN the system SHALL explain what evidence is useful without asking for sensitive private documents by default.

Acceptable evidence examples:

* Academy website contact page showing the requester email.
* Official academy email address.
* Instagram profile or post linking the requester to the academy.
* Optional BJJ belt rank and stripe count to help admins understand the requester's BJJ context before contacting them.
* Short explanation of ownership, coaching, or management role.

Done when:

* The form avoids requesting passports, financial documents, or unnecessary personal identity documents.
* Evidence text is only visible to platform admins.

---

## AC-006: Pending Claim Creation

IF a requester submits a valid claim

WHEN the submission is accepted

THEN the system SHALL create a claim request with `PENDING` status.

Done when:

* Claim stores academy, requester name, requester email, requester role, verification notes or evidence, status, and created date.
* Claim does not grant academy access.
* Academy details are not overwritten by the claim submission.

---

## AC-007: Duplicate Pending Claim Handling

IF a requester submits a claim for an academy that already has a pending claim from the same requester email

WHEN the submission is processed

THEN the system SHALL prevent duplicate pending claims and return a conflict response.

Done when:

* Duplicate pending claims for the same academy and requester email are not created.
* Requester email is normalized before duplicate checks.
* The requester receives a clear message that the claim is already awaiting review.

---

## AC-008: Claim Submission Confirmation

IF a claim request is created

WHEN the requester returns to the UI

THEN the system SHALL show confirmation that the claim is awaiting admin review.

Done when:

* Confirmation sets expectation that access is not immediate.
* Confirmation says RollFinders may contact the requester if more information is needed.

---

## AC-009: Claim Submitted Notification

IF a claim request is created

WHEN email delivery is available

THEN the system SHOULD send the requester a submission confirmation email.

Done when:

* Email includes academy name and pending status.
* Email does not include sensitive internal admin notes.

---

## AC-010: Admin Claim Navigation

IF a platform admin opens the admin dashboard

WHEN pending claims exist

THEN the system SHOULD provide a clear route to claim management.

Done when:

* Admin navigation exposes claim management or a pending claims metric.
* Pending claim count is visible where appropriate.

---

## AC-011: Admin Claim List

IF a platform admin opens claim management

WHEN claim requests exist

THEN the system SHALL show a claim list.

Done when:

* List shows academy name, requester name, requester email, requester role, submitted date, and status.
* List supports pagination if claim volume exceeds the standard admin page size.
* Platform admins can open claim details from the list.

---

## AC-012: Claim Status Filter

IF a platform admin opens the claim list

WHEN the admin filters by status

THEN the system SHALL show claims matching the selected status.

Done when:

* Filter supports all, pending, approved, and rejected.
* Selected filter is persisted in the URL query where consistent with existing admin filters.

---

## AC-013: Claim Detail Review

IF a platform admin opens a claim

WHEN the claim detail page renders

THEN the system SHALL show academy details, requester details, verification notes or evidence, current status, and submitted date.

Done when:

* Admin can compare existing academy public details against requester evidence.
* Private claim evidence is not shown on public pages.
* Already reviewed claims show reviewed date and reviewing admin where available.

---

## AC-014: Approve Pending Claim

IF a platform admin approves a pending claim

WHEN approval succeeds

THEN the system SHALL set the claim status to `APPROVED`.

Done when:

* Reviewed date is stored.
* Reviewing admin ID is stored.
* Claim cannot be approved twice.
* Approval is rejected if the claim is not pending.

---

## AC-015: Approved Owner Account And Initial Login

IF an approved claim requester does not already have a user account

WHEN the claim is approved

THEN the system SHALL create a user account as an academy owner/admin and send the requester an email with an initial password or secure setup instructions.

Done when:

* Requester email becomes the login identity.
* The created user is assigned the appropriate `Academy Admin` role.
* The requester receives an email containing an initial password or secure password setup link.
* Initial password handling follows the existing secure password and email delivery patterns.
* The requester does not need the platform admin to manually create a second account.

---

## AC-016: Existing Requester Account

IF an approved claim requester already has a user account with the claim email

WHEN the claim is approved

THEN the system SHALL link the existing user account to the claimed academy as an `Academy Admin`.

Done when:

* No duplicate user is created.
* Existing user receives the correct `Academy Admin` role for the claimed academy.
* Existing user receives an approval email explaining how to log in.

---

## AC-017: Academy Access Assignment

IF a claim is approved

WHEN the requester account exists or is linked

THEN the system SHALL grant `Academy Admin` access through the existing role and `AcademyMember` model.

Done when:

* Approved owner can access the claimed academy through the existing admin dashboard.
* Approved owner can update the claimed academy through existing academy management screens.
* Approved owner can add or edit open mats through existing open mat management screens.
* Approved owner cannot manage unrelated academies.

---

## AC-018: Approval Notification

IF a claim is approved

WHEN approval processing completes

THEN the system SHALL notify the requester with login access details.

Done when:

* Notification confirms the academy claim was approved.
* Notification explains how to access the admin account.
* Notification includes the initial password or a secure password setup link.
* Notification does not expose unrelated admin data.

---

## AC-019: Reject Pending Claim

IF a platform admin rejects a pending claim

WHEN rejection succeeds

THEN the system SHALL set the claim status to `REJECTED` and SHALL NOT grant academy access.

Done when:

* Reviewed date is stored.
* Reviewing admin ID is stored.
* Rejection can include a reason.
* Claim cannot be rejected twice.
* Rejection is blocked if the claim is not pending.

---

## AC-020: Rejection Notification

IF a claim is rejected

WHEN rejection processing completes

THEN the system SHALL notify the requester.

Done when:

* Notification confirms the claim was not approved.
* Public-safe rejection reason is included if provided.
* Requester is told they can reply or submit again with better evidence if that is supported.

---

## AC-021: Claim Audit Logging

IF a claim is approved or rejected

WHEN the decision is saved

THEN the system SHALL create an admin audit log entry.

Done when:

* Audit log includes actor, claim ID, academy ID, requester email, action, and timestamp.
* Audit log does not store full sensitive evidence unless already required by the audit model.
* Audit log does not grant access by itself.

---

## AC-022: Unauthorized Claim Review

IF a user without platform-level claim review permission attempts to view, approve, or reject claims

WHEN the request reaches the backend

THEN the system SHALL reject the request.

Done when:

* Unauthorized users cannot list claims.
* Unauthorized users cannot view claim evidence.
* Unauthorized users cannot approve or reject claims through direct endpoint calls.

---

## AC-023: Claim Analytics

IF analytics tracking is available

WHEN a requester starts or submits the claim flow

THEN the system SHOULD track non-sensitive claim events.

Events:

* `claim_profile_started`
* `claim_profile_submitted`
* `claim_profile_approved`
* `claim_profile_rejected`

Done when:

* Analytics payload does not include requester name, email, phone, belt rank, stripe count, or verification evidence.
* Academy ID or slug may be included if consistent with existing analytics policy.

---

# Acceptance Criteria

* Unclaimed academy profiles show a claim action.
* Claim form validates requester details and evidence.
* Valid submissions create pending claims without granting access.
* Claims can be submitted without BJJ belt rank or stripe information.
* Optional BJJ belt rank and stripe information is self-attested, private to admin review, and never used as ownership proof by itself.
* Duplicate pending claims from the same requester for the same academy are handled.
* Platform admins can list, filter, and inspect claims.
* Platform admins can approve pending claims.
* Platform admins can reject pending claims.
* Approved claims link or create a requester account.
* Approved requesters are automatically added as `Academy Admin` users for the claimed academy.
* Approved requesters receive an email with an initial password or secure password setup link.
* Rejected claims do not grant access.
* Requesters receive submission, approval, and rejection notifications where email is available.
* Claim decisions are audit logged.
* Unauthorized users cannot access claim review or decision endpoints.

---

# Admin Decision Guidance

Admins should approve claims when the requester appears authorized to manage the academy listing.

Useful approval signals:

* Requester uses an official academy email domain.
* Requester is listed on the academy website.
* Requester is clearly connected to the academy on official social channels.
* Requester is known to the RollFinders team or local BJJ community.
* Requester can provide a credible explanation and contact path.

Admins should reject or request more information when:

* The requester has no clear relationship to the academy.
* Evidence conflicts with public academy information.
* The requester uses only a generic personal email and provides weak evidence.
* Another approved owner already manages the academy and has not requested this person be added.

---

# Release Checklist

* Public claim action exists on unclaimed academy profiles.
* Claim form creates `PENDING` requests.
* Claim submission confirmation exists.
* Admin claim list exists.
* Admin claim detail page exists.
* Admin approve action works.
* Admin reject action works.
* Approved owner is automatically added as an `Academy Admin`.
* Approved owner receives initial login credentials or a secure password setup link by email.
* Approved owner access works in the existing admin dashboard.
* Approval and rejection emails are queued or sent.
* Claim decisions are audit logged.
* Permission checks protect all admin claim routes and actions.
* Existing public academy and open mat flows still work.

---

# Open Questions

* Should a claim be submitted without login for beta, then require account setup only after approval? Recommended: yes.
* Should approval automatically set `Academy.verificationStatus = VERIFIED`? Recommended: no for the first release. Ownership approval and public academy verification should remain separate states unless the admin explicitly verifies the academy.
* Should an already claimed academy allow additional owner requests? Recommended: not in the first release. Use the existing academy team invitation flow after the first owner is approved.
* Should admins be able to ask for more information instead of only approve or reject? Recommended: defer unless needed during beta.
* Should claim evidence support file uploads? Recommended: defer. Use text and public links first.
