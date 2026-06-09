# PRD: Academy Claim Invitation Email

Version: 1.0

Status: Done

Priority: High

Review date: 2026-06-06

---

# Objective

When RollFinders adds an academy listing to the platform, send an invitation email to the academy contact so
 the rightful owner or authorized staff member can claim the academy and start managing the listing if an email is provided.
 RollFinders can also send claim reminder emails manually from the Admin Academies UI when an academy is unclaimed and has a valid usable email.

---

# Product Context

RollFinders may create academy listings before the academy owner has joined the platform. 
These listings help practitioners discover where to train, but they should eventually be claimed by the academy so details, open mats, and contact information stay accurate.

This email is not a generic user onboarding email. It is an academy ownership invitation that asks the academy to claim an existing listing.

Current implementation already includes manual claim reminders, backend eligibility checks, reliable outbound email queueing, reminder outcome tracking, the public claim flow, duplicate pending claim protection, and admin-reviewed claim approval. This PRD should build on those existing behaviours instead of introducing a separate access-granting invitation system.

---

# Implementation Direction

RollFinders SHALL reuse the existing public academy claim flow for claim invitation links:

`/academies/[slug]/claim`

The system SHALL NOT introduce signed claim invitation tokens for this MVP requirement unless product later requires invite attribution, expiry, or private invite-only claim pages.

Existing `AcademyInvitation` records SHALL NOT be reused for academy claim invitations because those invitations are for academy team/admin access after an academy is already managed. Academy claim invitation emails must only lead to a pending public claim request and must never grant academy management access directly.

The first implementation ticket SHALL be:

**Shared Academy Claim Invitation Template Renderer + Manual Reminder Conversion**

This ticket SHALL:

* Load the completed canonical HTML template from `src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html`.
* Render the required placeholders with escaped dynamic values.
* Fail safely when any required value is missing or any `{{...}}` placeholder remains unresolved.
* Replace the existing inline manual reminder HTML in `src/app/admin/academies/actions.ts`.
* Preserve the existing reminder eligibility checks, cooldown, skip/fail/queued outcomes, audit logging, and `AcademyClaimReminder` records.

Later tickets SHALL add academy-created automatic invitation queueing and admin send/skip controls.

---

# Scope

In scope:

* Email sent after a platform admin adds or imports an academy listing.
* Manual claim reminder emails sent from the Admin Academies UI.
* Email format and content for academy claim invitations.
* Rendering and sending the completed academy claim invitation HTML template. See `../Completed/AcademyClaimInvitationHtmlTemplatePrd.md`.
* Claim invitation link generation.
* Reliable email queueing and delivery tracking.
* Admin feedback when the invitation or reminder is queued, skipped, or fails.
* Audit metadata for invitation generation.

Out of scope:

* Marketing campaigns.
* Bulk email newsletters.
* Auto-approving claims without admin review.
* Replacing the public `Claim this academy` flow.
* Replacing academy team member invitations after an academy is already claimed.

---

# Email Format

The academy claim invitation email SHALL use the completed `AcademyClaimInvitation` HTML template as its source of truth.

Completed template PRD:

`docs/features/Communications/Email/AcademyClaimEmails/Products/Completed/AcademyClaimInvitationHtmlTemplatePrd.md`

Canonical template source:

`src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html`

Production S3 template object:

`s3://rollfinders/mails/invitations/academy-claim-invitation.html`

Subject:

`Claim your academy listing on RollFinders`

Sender:

`support@rollfinders.com`

Reply-to:

`support@rollfinders.com`

Required body content:

* Academy name.
* Academy public profile URL.
* Clear reason for the email: RollFinders has added the academy listing.
* Claim invitation call to action.
* Claim invitation URL or signed token link.
* Short explanation of what claiming allows: update details, manage open mats, and keep listing accurate.
* Trust copy: claiming is reviewed before management access is granted.
* Support contact: `support@rollfinders.com`.

Tone:

* Direct and professional.
* Clear that no payment is required to claim.
* No pressure language.
* No implication that the academy has already approved or partnered with RollFinders.

Template variables:

* `{{academyName}}`
* `{{academyProfileUrl}}`
* `{{claimInvitationUrl}}`
* `{{recipientEmail}}`
* `{{supportEmail}}`
* `{{currentYear}}`

---

# IF/WHEN/THEN Requirements

## ACADEMY-CLAIM-EMAIL-000: Reuse Existing Public Claim Flow

IF an academy claim invitation or manual claim reminder is generated

WHEN the claim call to action URL is built

THEN the system SHALL use the existing public academy claim route for the academy, such as `/academies/[slug]/claim`, and SHALL NOT use `AcademyInvitation` access tokens.

## ACADEMY-CLAIM-EMAIL-000A: No Team Invitation Token Reuse

IF the system sends an academy claim invitation

WHEN it chooses a persistence or token model

THEN it SHALL NOT reuse academy team/admin invitation tokens because those tokens belong to post-claim academy access management.

## ACADEMY-CLAIM-EMAIL-001: Queue After Academy Creation

IF a platform admin creates an academy listing with a contact email

WHEN the academy record is saved successfully

THEN the system SHALL queue an academy claim invitation email to the academy contact email.

## ACADEMY-CLAIM-EMAIL-002: Optional Send Control

IF a platform admin creates or edits an academy listing

WHEN the admin chooses not to send a claim invitation

THEN the system SHALL save the academy without queueing the claim invitation email.

## ACADEMY-CLAIM-EMAIL-003: Claim Invitation Link

IF an academy claim invitation email is queued

WHEN the email body is built

THEN the system SHALL include a claim invitation link that opens the existing public academy claim flow with the academy preselected.

## ACADEMY-CLAIM-EMAIL-004: Academy Profile Link

IF an academy claim invitation email is queued

WHEN the email body is built

THEN the system SHALL include the public academy profile URL.

## ACADEMY-CLAIM-EMAIL-005: Email Content

IF an academy claim invitation email is generated

WHEN the email body is built

THEN the system SHALL render the completed `AcademyClaimInvitation` HTML template with academy name, claim action, public profile link, claim review explanation, support contact, recipient email, and current year.

## ACADEMY-CLAIM-EMAIL-005A: Completed Template Source

IF the academy claim invitation email is queued

WHEN the HTML body is resolved

THEN the system SHALL use `src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html` or the deployed S3 object at `s3://rollfinders/mails/invitations/academy-claim-invitation.html` as the approved HTML template source.

## ACADEMY-CLAIM-EMAIL-005B: Template Placeholder Safety

IF the completed template is rendered

WHEN any required template variable is missing

THEN the system SHALL fail email generation, record a clear operational error, and SHALL NOT send an email with unresolved placeholders.

## ACADEMY-CLAIM-EMAIL-006: No Auto Approval

IF an academy recipient opens the claim invitation link

WHEN the claim form is submitted

THEN the system SHALL create or update a pending claim request and SHALL NOT grant academy management access until platform admin approval.

## ACADEMY-CLAIM-EMAIL-007: Reliable Email Queue

IF the academy claim invitation email is queued

WHEN the reliable email system accepts the email

THEN the system SHALL create an outbound email record.

## ACADEMY-CLAIM-EMAIL-008: Queue Failure Feedback

IF academy creation succeeds but claim invitation email queueing fails

WHEN the admin returns to the academy workflow

THEN the system SHALL communicate that the academy was saved but the claim invitation was not queued.

## ACADEMY-CLAIM-EMAIL-009: Duplicate Invitation Protection

IF an academy already has a pending claim invitation or pending claim request for the same contact email

WHEN another claim invitation is requested

THEN the system SHALL prevent duplicate active invitation emails, skip the send, or record a clear replacement decision without creating an access-granting token.

## ACADEMY-CLAIM-EMAIL-010: Audit Metadata

IF an academy claim invitation email is queued

WHEN audit metadata is recorded

THEN the metadata SHALL include actor, academy ID, academy name, recipient email, invitation source, and timestamp.

## ACADEMY-CLAIM-EMAIL-011: Sensitive Data Protection

IF claim invitation metadata, logs, or outbound email records are written

WHEN the system stores the data

THEN the system SHALL NOT store private claim evidence, plaintext credentials, or reusable secret tokens in logs or audit metadata.

## ACADEMY-CLAIM-EMAIL-012: Sender Configuration

IF an academy claim invitation email is sent

WHEN the email payload is built

THEN the email SHALL use `noreply@rollfinders.com` as sender and `support@rollfinders.com` as reply-to.

## ACADEMY-CLAIM-EMAIL-013: Manual Reminder Eligibility

IF a platform admin requests a manual claim reminder from the Admin Academies UI

WHEN the backend evaluates the academy

THEN the system SHALL only queue the reminder when the academy is unclaimed, has a valid usable email, is not suppressed, and is outside the configured reminder cooldown window.

## ACADEMY-CLAIM-EMAIL-014: Manual Reminder Search And Filter Source

IF the admin finds academies through search or claim reminder filters

WHEN a manual reminder is requested

THEN the email system SHALL still rely on backend eligibility checks and SHALL NOT trust frontend search or filter state as the sending authority.

## ACADEMY-CLAIM-EMAIL-015: Manual Reminder Copy

IF a manual claim reminder email is generated

WHEN the email body is built

THEN the system SHALL render the same completed `AcademyClaimInvitation` HTML template and populate the claim CTA with the eligible academy's claim URL.

## ACADEMY-CLAIM-EMAIL-016: Manual Reminder No Ownership Grant

IF a recipient opens a manual claim reminder link

WHEN they submit the claim flow

THEN the system SHALL create or update a pending claim request and SHALL NOT grant management access without platform-admin approval.

## ACADEMY-CLAIM-EMAIL-017: Manual Reminder Outcome Tracking

IF a manual claim reminder is requested

WHEN the system queues, skips, or fails the reminder

THEN the system SHALL expose an outcome that the Admin Academies UI can display as queued, skipped, or failed.

---

# Development Requirements

## Ticket 1: Shared Template Renderer And Manual Reminder Conversion

Status: Done

* Add a shared academy claim invitation email renderer.
* Load `src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html`.
* Render required placeholders:
  * `{{academyName}}`
  * `{{academyProfileUrl}}`
  * `{{claimInvitationUrl}}`
  * `{{recipientEmail}}`
  * `{{supportEmail}}`
  * `{{currentYear}}`
* Escape dynamic values before interpolation.
* Fail email generation if a required value is missing.
* Fail email generation if unresolved `{{...}}` placeholders remain.
* Replace the existing hand-built manual reminder HTML/text in `src/app/admin/academies/actions.ts`.
* Keep existing manual reminder eligibility, cooldown, invalid-email suppression, `AcademyClaimReminder`, and admin audit behaviour.
* Add tests for renderer output, missing placeholders, and manual reminder queue content.

## Ticket 2: Academy Creation Invitation Queueing

Status: Done

* Queue the same rendered academy claim invitation email after `createAcademy` saves a new academy with a valid usable email.
* Record `AcademyClaimReminder.source = "academy_creation"` or equivalent audit metadata so automatic invitations are distinguishable from manual reminders.
* Reuse existing invalid-email and pending-claim checks before queueing.
* Surface partial success when the academy is saved but the email is skipped or fails to queue.
* Add tests for successful queueing, invalid email skip, pending claim skip, and queue failure feedback.

## Ticket 3: Admin Send Or Skip Control

Status: Done

* Add a create/edit academy UI control that lets platform admins choose whether to send the claim invitation.
* Default behaviour SHOULD send when a valid academy email exists, unless product chooses an explicit opt-in default.
* Preserve academy save behaviour when the admin chooses not to send.
* Show clear admin feedback for queued, skipped, failed, or intentionally not sent.

## Shared Requirements

* Add a platform-admin control to send or resend a claim invitation from academy create/edit workflows.
* Add Admin Academies UI support for manual claim reminders to unclaimed academies with valid usable emails.
* Use the completed HTML template requirement from `../Completed/AcademyClaimInvitationHtmlTemplatePrd.md`.
* Render `src/lib/email/templates/academy-claim-invitation/v1/academy-claim-invitation.html` or the deployed S3 object at `s3://rollfinders/mails/invitations/academy-claim-invitation.html`.
* Do not maintain a separate inline HTML body for claim invitation or manual reminder emails.
* Generate a claim invitation URL that uses the existing public academy claim flow and preselects the academy.
* Queue the email through the existing reliable email system.
* Track outbound email status using existing email status and retry behavior.
* Show admin queued, skipped, and failed feedback.
* Reuse the existing academy claim review and approval workflow after the recipient submits a claim.
* Add tests for email content, queueing behavior, duplicate protection, and failure feedback.

---

# Acceptance Criteria

* Platform admins can send a claim invitation when adding an academy.
* Product has a defined email format for the invitation through the completed `AcademyClaimInvitation` HTML template.
* Invitation email includes academy name, public profile URL, and claim CTA.
* Claim invitation opens the claim flow with the academy preselected.
* Claim submission still requires platform admin approval.
* Outbound email record is created.
* Duplicate active invitations are prevented or replaced intentionally.
* Admin feedback distinguishes academy save success from email queue failure.
* Email uses `support@rollfinders.com`.
* Invitation and manual reminder emails render the same completed HTML template.
* Email generation fails safely if required template variables are missing.
* Manual reminders can be queued only for eligible unclaimed academies.
* Manual reminder outcomes can be shown in the Admin Academies UI.
