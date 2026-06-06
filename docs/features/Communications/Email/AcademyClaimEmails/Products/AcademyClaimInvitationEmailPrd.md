# PRD: Academy Claim Invitation Email

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

When RollFinders adds an academy listing to the platform, send an invitation email to the academy contact so
 the rightful owner or authorized staff member can claim the academy and start managing the listing if an email is provided.
 RollFinders can also send a remainder emails manully via a UI interface with the Academic selected and a send remainder email.

---

# Product Context

RollFinders may create academy listings before the academy owner has joined the platform. 
These listings help practitioners discover where to train, but they should eventually be claimed by the academy so details, open mats, and contact information stay accurate.

This email is not a generic user onboarding email. It is an academy ownership invitation that asks the academy to claim an existing listing.

---

# Scope

In scope:

* Email sent after a platform admin adds, resend reminder or imports an academy listing.
* Email format and content for academy claim invitations.
* HTML template requirement for the invitation email. See `AcademyClaimInvitationHtmlTemplatePrd.md`.
* Claim invitation link generation.
* Reliable email queueing and delivery tracking.
* Admin feedback when the invitation is queued or fails.
* Audit metadata for invitation generation.

Out of scope:

* Marketing campaigns.
* Bulk email newsletters.
* Auto-approving claims without admin review.
* Replacing the public `Claim this academy` flow.
* Replacing academy team member invitations after an academy is already claimed.

---

# Email Format

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

---

# IF/WHEN/THEN Requirements

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

THEN the system SHALL include a claim invitation link that opens the academy claim flow with the academy preselected.

## ACADEMY-CLAIM-EMAIL-004: Academy Profile Link

IF an academy claim invitation email is queued

WHEN the email body is built

THEN the system SHALL include the public academy profile URL.

## ACADEMY-CLAIM-EMAIL-005: Email Content

IF an academy claim invitation email is generated

WHEN product reviews the email format

THEN the email SHALL include academy name, claim action, public profile link, claim review explanation, and support contact.

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

THEN the system SHALL prevent duplicate active invitations or clearly replace the prior invitation token.

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

THEN the email SHALL use `support@rollfinders.com` as sender and reply-to.

---

# Development Requirements

* Add a platform-admin control to send or resend a claim invitation from academy create/edit workflows.
* Use the approved HTML email template requirement from `AcademyClaimInvitationHtmlTemplatePrd.md`.
* Generate a claim invitation URL that preselects the academy in the public claim flow.
* Queue the email through the existing reliable email system.
* Track outbound email status using existing email status and retry behavior.
* Show admin success or queue-failure feedback.
* Reuse the existing academy claim review and approval workflow after the recipient submits a claim.
* Add tests for email content, queueing behavior, duplicate protection, and failure feedback.

---

# Acceptance Criteria

* Platform admins can send a claim invitation when adding an academy.
* Product has a defined email format for the invitation.
* Invitation email includes academy name, public profile URL, and claim CTA.
* Claim invitation opens the claim flow with the academy preselected.
* Claim submission still requires platform admin approval.
* Outbound email record is created.
* Duplicate active invitations are prevented or replaced intentionally.
* Admin feedback distinguishes academy save success from email queue failure.
* Email uses `support@rollfinders.com`.
