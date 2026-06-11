# PRD: Public Academy Registration

Version: 0.1

Status: Reviewing

Priority: High

Review date: 2026-06-11

Implementation evidence: No implementation has been confirmed for a public academy registration intake flow. Existing admin academy creation, verification status, pending academy review, and academy claim workflows provide related platform patterns.

Branch:

`feature/public-academy-registration`

---

# Objective

Decide whether RollFinder should expose a public `Create Academy` registration form so academy representatives can submit their academy directly into the platform.

If approved, submitted academies SHALL enter a review queue and SHALL NOT be treated as verified, featured, or fully public until a Platform Admin or Super Admin reviews the submission.

---

# Business Analyst Discussion

## Opportunity

Public academy registration can reduce manual platform data entry and create a clearer acquisition path for academy owners who want to appear on RollFinder.

Expected business benefits:

* Increase academy supply without requiring internal admin entry for every academy.
* Give legitimate academy representatives a low-friction onboarding route.
* Convert organic visitors into academy leads.
* Build a structured review pipeline for new academy data.

## Business Risks

The form exposes a new public intake surface, so the platform must protect public data quality and admin workload.

Primary risks:

* Spam, duplicate, or low-quality submissions.
* People submitting academies they do not represent.
* Public users assuming submitted academies are endorsed before review.
* Admin review volume growing without adequate triage tools.
* Confusion with the existing academy claim workflow.

## Product Recommendation

Proceed only if the first release is review-gated.

The public form SHOULD create an academy registration request or a pending academy record that requires Platform Admin or Super Admin approval before the academy is published as trusted platform data.

The first release SHOULD avoid automatic ownership grants unless the reviewer explicitly approves the academy representative and assigns academy admin access.

Recommended MVP decision:

* Public submissions should be hidden from public academy discovery until reviewed.
* Approval should create an academy record but should not automatically verify it unless the reviewer explicitly chooses `VERIFIED`.
* Ownership should be a second explicit reviewer decision, not an automatic side effect of registration.
* The first release should send only a submission confirmation email if email delivery is already available; approval/rejection emails can be a follow-up if needed.
* Duplicate submissions should be surfaced to reviewers rather than blocked outright, because the reviewer may need to merge, reject, or convert the submission into a claim workflow.

---

# Technical Lead Discussion

## Recommended Architecture

Prefer a dedicated public submission workflow over directly publishing academy records.

Viable implementation options:

* Create a new `AcademyRegistrationRequest` model for untrusted public submissions.
* Or create `Academy` records with `verificationStatus = PENDING`, `verified = false`, and a separate source/status marker for public submissions.

Technical recommendation:

Use a dedicated request model if the submitted data needs moderation, duplicate checks, rejection reasons, requester identity, or audit history before becoming an academy. Use direct pending academy creation only if the product accepts unverified records appearing in admin academy management immediately.

Preferred implementation path:

Use a dedicated `AcademyRegistrationRequest` or similarly named model for public intake. This keeps untrusted public data out of the public academy directory until review, preserves a clean moderation history, and avoids overloading `Academy.verificationStatus` with both data-quality review and public-submission lifecycle.

The request model can store submitted academy fields, requester contact details, moderation status, duplicate hints, reviewer fields, rejection reason, and an optional linked academy after approval.

Directly creating `Academy` rows with `verificationStatus = PENDING` is faster, but it creates ambiguity:

* `PENDING` can mean admin-created academy awaiting verification, not necessarily public-submitted academy.
* Public discovery code must be carefully checked so pending public submissions never leak.
* Rejected submissions become harder to retain without polluting academy management.
* Duplicate and requester review metadata needs extra fields on the main academy table.

For that reason, the dedicated request model is the recommended MVP foundation.

## Required Controls

The public endpoint SHALL include:

* Server-side validation using the existing academy validation conventions where practical.
* Public rate limiting or abuse controls.
* Duplicate detection by academy name, postcode, website, and contact email.
* Explicit moderation status: `PENDING_REVIEW`, `APPROVED`, `REJECTED`, or equivalent.
* Audit logging for review actions.
* Role checks so only Platform Admin and Super Admin can approve or reject submissions.
* Admin review UI with enough submitted context to make a decision.

## Data And Publishing Rules

Until approval:

* The academy SHALL NOT be marked verified.
* The academy SHALL NOT be featured.
* The academy SHALL NOT display a verified academy badge.
* The academy SHOULD NOT be publicly discoverable unless the product explicitly accepts showing unverified pending listings.

On approval:

* The system SHALL create or update the academy record.
* The academy SHALL remain `PENDING` or become `VERIFIED` according to the reviewer action.
* Ownership/admin access SHALL only be granted when the reviewer approves the requester as an academy representative.

On rejection:

* The platform SHALL retain enough request metadata for audit and duplicate handling.
* The requester MAY receive a rejection email if email operations are enabled for this flow.

---

# User Stories

As an academy representative, I want to submit my academy to RollFinder so that it can be reviewed for inclusion on the platform.

As a Platform Admin, I want to review public academy submissions before they appear as trusted platform data so that academy quality and ownership remain controlled.

As a Super Admin, I want visibility into public intake activity so that I can monitor growth, abuse, and operational workload.

---

# Scope

In scope:

* Public academy registration form.
* Public registration submission API.
* Admin review queue for submitted academies.
* Approve and reject workflow.
* Duplicate and abuse safeguards.
* Review audit logging.
* Optional requester notification emails.

Out of scope:

* Automatic academy verification.
* Automatic featured placement.
* Paid academy onboarding.
* External business registry verification.
* Bulk academy import.
* Public reviews or ratings.

---

# Decision Points

The BA and technical lead need to confirm:

* `DEC-001`: Pending submitted academies are hidden from public discovery until approval. Recommended: yes.
* `DEC-002`: Approval creates an academy only, or also grants academy admin ownership. Recommended: academy only by default; ownership requires explicit reviewer action.
* `DEC-003`: Approval can set academy verification status. Recommended: reviewer chooses `PENDING` or `VERIFIED`; default to `PENDING`.
* `DEC-004`: Registration emails reuse academy claim messaging or use separate templates. Recommended: separate templates because claim and registration are different user promises.
* `DEC-005`: Rejected requesters receive a reason. Recommended: store an internal reason first; public requester messaging can be generic for MVP.
* `DEC-006`: Duplicate submissions merge with existing academy claim workflows. Recommended: surface possible matches and let reviewers convert to claim handling manually in MVP.

---

# Priority-Ordered Sub-Tickets

## Ticket 1: Product Decision And Trust Boundary

Priority: P0

Dependency: none

Goal: lock the product rules before schema and UI work starts.

### PAR-001: Review-Gated Intake Decision

IF the team approves public academy registration

WHEN implementation starts

THEN the team SHALL document that submissions require Platform Admin or Super Admin review before becoming trusted platform data.

Done when:

* The decision is recorded in this PRD.
* The public form copy avoids promising instant publication.
* Approval authority is limited to Platform Admin and Super Admin.

### PAR-002: Public Visibility Boundary

IF an academy registration request is pending or rejected

WHEN public academy discovery, profile, search, or map pages load

THEN the submitted academy SHALL NOT appear as a public academy listing.

Done when:

* Pending registration requests are not included in public academy queries.
* Rejected registration requests are not included in public academy queries.
* Public verified badges only come from approved academy records.

### PAR-003: Ownership Boundary

IF a requester submits an academy registration

WHEN the request is accepted for review

THEN the requester SHALL NOT automatically receive academy admin access.

Done when:

* Request submission does not create an academy membership.
* Request submission does not create an academy admin role.
* Admin ownership assignment is handled only during or after review.

---

## Ticket 2: Registration Request Data Model

Priority: P0

Dependency: Ticket 1

Goal: store untrusted public submissions separately from approved academy records.

### PAR-004: Registration Request Persistence

IF the system receives a valid public academy registration

WHEN the submission is saved

THEN the system SHALL create an academy registration request with `PENDING_REVIEW` status.

Done when:

* A request table or equivalent persistence model exists.
* Status supports pending, approved, and rejected states.
* Submitted academy fields and requester contact fields are stored.

### PAR-005: Request Review Metadata

IF a registration request is reviewed

WHEN the reviewer approves or rejects it

THEN the system SHALL store review metadata on the request.

Done when:

* Reviewer user ID can be stored.
* Reviewed timestamp can be stored.
* Rejection reason can be stored.
* Linked academy ID can be stored after approval.

### PAR-006: Request Audit Events

IF a registration request is created, approved, or rejected

WHEN the action completes

THEN the system SHALL write an audit event for the action.

Done when:

* Submission creation is auditable.
* Approval records actor, request, linked academy, and timestamp.
* Rejection records actor, request, reason if supplied, and timestamp.

---

## Ticket 3: Public Submission API

Priority: P0

Dependency: Ticket 2

Goal: accept public registrations safely without creating trusted academy records.

### PAR-007: Public API Validation

IF a public visitor submits academy registration data

WHEN the API receives the payload

THEN the system SHALL validate all required academy and requester fields server-side.

Done when:

* Invalid payloads are rejected server-side.
* Required academy fields cannot be empty.
* Required requester contact fields cannot be empty.
* Validation errors are returned without creating a request.

### PAR-008: Safe Request Creation

IF the public registration payload is valid

WHEN the API creates the request

THEN the system SHALL create only a registration request, not a verified academy.

Done when:

* No `Academy` row is created unless that is explicitly approved in the technical design.
* No academy is marked `verified = true`.
* No academy is marked `featured = true`.
* The response confirms submission for review.

### PAR-009: Public Abuse Controls

IF public academy registration is enabled

WHEN repeated or suspicious submissions hit the endpoint

THEN the system SHALL apply rate limiting, bot mitigation, or equivalent abuse controls.

Done when:

* The endpoint has rate limiting or documented equivalent protection.
* Failed validation attempts do not bypass abuse controls.
* Abuse-control failures return a safe public response.

### PAR-010: Duplicate Hint Generation

IF a submitted academy resembles an existing academy or pending request

WHEN the submission is processed

THEN the system SHALL store duplicate hints for admin review.

Done when:

* Matching considers academy name.
* Matching considers postcode or address.
* Matching considers website or contact email where available.
* Possible matches are stored or queryable for the review UI.

---

## Ticket 4: Public Registration Form

Priority: P1

Dependency: Ticket 3

Goal: give academy representatives a clear, public way to submit an academy for review.

### PAR-011: Public Form Route

IF public academy registration is enabled

WHEN a visitor opens the registration route

THEN the system SHALL render a public academy registration form.

Done when:

* The form is reachable without dashboard access.
* The route fits the public site navigation strategy.
* The page explains that submissions are reviewed before publication.

### PAR-012: Academy Details Fields

IF a visitor fills out the registration form

WHEN they enter academy details

THEN the form SHALL collect the minimum academy information needed for review.

Done when:

* Academy name is collected.
* Address, city, postcode, and country are collected.
* Contact or website fields are collected where available.
* Optional training attributes can be supplied if they are part of existing academy data.

### PAR-013: Requester Details Fields

IF a visitor submits an academy registration

WHEN they identify themselves

THEN the form SHALL collect requester contact and relationship details.

Done when:

* Requester name is collected.
* Requester email is collected.
* Requester relationship to the academy is collected.
* Consent or acknowledgement copy confirms the request will be reviewed.

### PAR-014: Submission Confirmation

IF a visitor submits a valid registration form

WHEN the request is accepted

THEN the UI SHALL show a confirmation state without implying immediate publication.

Done when:

* The user sees that the submission was received.
* The user sees that admin review is required.
* The form does not expose internal review details.

---

## Ticket 5: Admin Review Queue

Priority: P1

Dependency: Ticket 2

Goal: allow Platform Admin and Super Admin users to triage submitted academies.

### PAR-015: Review Queue Access

IF a user opens the registration review queue

WHEN the system checks their role

THEN only Platform Admin and Super Admin users SHALL be allowed to access it.

Done when:

* Platform Admin can access the queue.
* Super Admin can access the queue.
* Academy Admin and Standard users are denied.

### PAR-016: Pending Request List

IF pending registration requests exist

WHEN an authorized reviewer opens the queue

THEN the system SHALL list pending requests with submitted academy and requester summary.

Done when:

* Pending requests are visible.
* Requester name and email are visible.
* Submitted academy name and location are visible.
* Submitted date is visible.

### PAR-017: Request Detail View

IF an authorized reviewer opens a registration request

WHEN the detail page renders

THEN the system SHALL show the full submitted academy data, requester data, status, and duplicate hints.

Done when:

* Full academy details are visible.
* Full requester details are visible.
* Duplicate hints or possible matches are visible.
* Current moderation status is visible.

### PAR-018: Review Status Filters

IF an authorized reviewer views registration requests

WHEN they filter by status

THEN the system SHALL support pending, approved, and rejected request views.

Done when:

* Pending filter works.
* Approved filter works.
* Rejected filter works.
* Empty states are clear.

---

## Ticket 6: Approval Workflow

Priority: P1

Dependency: Ticket 5

Goal: convert reviewed submissions into academy records under explicit admin control.

### PAR-019: Approve As Pending Academy

IF a reviewer approves a registration request without verifying it

WHEN the approval action succeeds

THEN the system SHALL create or update an academy with `verificationStatus = PENDING` and `verified = false`.

Done when:

* The request is marked approved.
* A linked academy exists.
* The academy is not verified.
* The academy is not featured unless explicitly selected by the reviewer.

### PAR-020: Approve As Verified Academy

IF a reviewer explicitly chooses to verify during approval

WHEN the approval action succeeds

THEN the system SHALL create or update an academy with `verificationStatus = VERIFIED` and `verified = true`.

Done when:

* Verification is an explicit reviewer choice.
* The request is marked approved.
* The linked academy is verified.
* Public verified badge behavior matches existing academy verification rules.

### PAR-021: Assign Ownership During Approval

IF a reviewer explicitly chooses to assign academy ownership during approval

WHEN the approval action succeeds

THEN the system SHALL grant academy admin access to the approved requester.

Done when:

* Ownership assignment is optional.
* Requester identity is matched to an existing or newly created user according to existing user rules.
* Academy membership is created only after reviewer confirmation.
* Ownership assignment is audited.

### PAR-022: Approval Duplicate Handling

IF a reviewer approves a request that matches an existing academy

WHEN they choose the existing academy as the target

THEN the system SHALL link or update the existing academy instead of creating a duplicate.

Done when:

* Reviewer can select an existing academy match.
* The request links to the selected academy.
* The system does not create a duplicate academy record.

---

## Ticket 7: Rejection Workflow

Priority: P1

Dependency: Ticket 5

Goal: close invalid, duplicate, or low-quality submissions without publishing them.

### PAR-023: Reject Registration Request

IF a reviewer rejects a pending registration request

WHEN the rejection action succeeds

THEN the system SHALL mark the request as rejected and SHALL NOT create a public academy.

Done when:

* The request status becomes rejected.
* No verified academy is created.
* No academy admin access is granted.
* Rejection is audited.

### PAR-024: Store Rejection Reason

IF a reviewer rejects a request

WHEN they provide an internal rejection reason

THEN the system SHALL store the reason for admin audit and future duplicate review.

Done when:

* Rejection reason is optional or required according to product decision.
* Stored reason is visible to authorized reviewers.
* Stored reason is not exposed publicly by default.

### PAR-025: Reject Duplicate Submission

IF a request is rejected because it duplicates an existing academy

WHEN the rejection is saved

THEN the system SHALL retain the duplicate relationship or note for future review.

Done when:

* Duplicate target can be referenced or noted.
* Future reviewers can understand why the request was rejected.
* The existing academy remains unchanged unless explicitly updated by a reviewer.

---

## Ticket 8: Notifications

Priority: P2

Dependency: Tickets 3, 6, and 7

Goal: keep requesters informed without overpromising approval or publication timing.

### PAR-026: Submission Confirmation Email

IF email delivery is enabled for registration submissions

WHEN a public request is accepted

THEN the system SHOULD send the requester a confirmation email.

Done when:

* Email confirms the request was received.
* Email explains review is required.
* Email does not promise approval or publication.

### PAR-027: Approval Notification Email

IF approval notification is enabled

WHEN a request is approved

THEN the system SHOULD notify the requester that the academy has been approved or created.

Done when:

* Email identifies the approved academy.
* Email explains whether ownership was granted.
* Email avoids exposing internal admin notes.

### PAR-028: Rejection Notification Email

IF rejection notification is enabled

WHEN a request is rejected

THEN the system SHOULD notify the requester with approved public-facing rejection copy.

Done when:

* Email does not expose internal rejection notes unless explicitly allowed.
* Email gives a safe next step if the requester believes the decision is wrong.
* Email delivery failure does not block rejection.

---

## Ticket 9: Metrics And Operations

Priority: P2

Dependency: Tickets 5, 6, and 7

Goal: help admins monitor intake volume and review workload.

### PAR-029: Pending Registration Count

IF pending registration requests exist

WHEN Platform Admin or Super Admin opens the dashboard

THEN the system SHOULD show a pending academy registrations count.

Done when:

* Count includes only pending review requests.
* Count links to the review queue if a queue route exists.
* Count is hidden from unauthorized users.

### PAR-030: Intake Activity Summary

IF registration requests are created or reviewed

WHEN Super Admin views platform activity

THEN the system SHOULD summarize submission, approval, and rejection activity.

Done when:

* Submitted count is available.
* Approved count is available.
* Rejected count is available.
* Time period is clear.

---

## Ticket 10: Test Coverage And Release Checks

Priority: P0 for core flow, P2 for optional notifications and metrics

Dependency: each related implementation ticket

Goal: verify the public trust boundary, role boundary, and review outcomes.

### PAR-031: Public Submission Tests

IF public registration API is implemented

WHEN tests run

THEN validation, request creation, and abuse-control behavior SHALL be covered.

Done when:

* Invalid payload tests exist.
* Valid submission creates pending request.
* Valid submission does not create a verified academy.

### PAR-032: Admin Role Tests

IF admin review queue or review actions are implemented

WHEN tests run

THEN role access SHALL be covered.

Done when:

* Platform Admin access is allowed.
* Super Admin access is allowed.
* Academy Admin and Standard user access is denied.

### PAR-033: Approval And Rejection Tests

IF approval and rejection workflows are implemented

WHEN tests run

THEN status transitions and public trust boundaries SHALL be covered.

Done when:

* Approval creates or links academy correctly.
* Rejection does not publish an academy.
* Verified status only appears after explicit verification.
* Audit events are asserted where test infrastructure supports them.

---

# Acceptance Criteria

* BA and technical lead decision is recorded before implementation starts.
* Public registration does not bypass Platform Admin or Super Admin review.
* Submitted academies are protected by validation, duplicate checks, and abuse controls.
* Approval and rejection actions are role-scoped and audited.
* Public trust signals remain accurate throughout the workflow.

---

# Implementation Notes

Suggested delivery sequence:

1. Ticket 1: Product Decision And Trust Boundary.
2. Ticket 2: Registration Request Data Model.
3. Ticket 3: Public Submission API.
4. Ticket 10 core tests for submission and trust boundary.
5. Ticket 4: Public Registration Form.
6. Ticket 5: Admin Review Queue.
7. Ticket 6: Approval Workflow.
8. Ticket 7: Rejection Workflow.
9. Ticket 10 role and transition tests.
10. Ticket 8: Notifications.
11. Ticket 9: Metrics And Operations.

Best delivery approach:

Build this as a moderation pipeline, not as an extension of the existing admin `New Academy` form. The public experience and the admin create experience share fields, but they have different trust levels. Keeping public submissions in a registration request model reduces the chance of accidentally publishing unreviewed data and gives admins a cleaner queue for approval, rejection, duplicate handling, and future analytics.

The first production release should include only the minimum complete loop: public submission, pending request storage, admin queue, approve, reject, and tests. Notifications and dashboard metrics are useful but should not block the core trust-gated workflow.
