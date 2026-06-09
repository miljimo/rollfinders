# PRD: User Onboarding Email Delivery

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Queue onboarding emails for all user onboarding paths, while preserving admin-created user creation, academy invitation, and reliable outbound email behavior.

---

# Scope

In scope:

* Admin-created users.
* Academy invited users.
* Self-registered users if self-registration is enabled.
* Future user onboarding paths that create or activate a user account.
* Existing reliable email queue, retry, invalid-email handling, and audit metadata.

Out of scope:

* Email body credential rules. See `UserOnboardingCredentialContentPrd.md`.
* Marketing email.
* Bulk user import.
* Replacing password reset or academy invitation acceptance flows.

---

# Existing Flow Constraint

The implementation must preserve:

* Existing `/admin/users` create-user workflow.
* Existing academy team invitation workflow.
* Existing role and academy assignment rules.
* Existing protected super-admin safeguards.
* Existing password reset email action.

---

# IF/WHEN/THEN Requirements

## USER-ONBOARD-DELIVERY-001: Admin-Created User Email

IF an authorized admin creates a user

WHEN the user record is created successfully

THEN the system SHALL queue an onboarding email to the created user's email address.

## USER-ONBOARD-DELIVERY-002: Academy Invitation Email

IF an academy team invitation is created or resent

WHEN the invitation token is generated successfully

THEN the system SHALL queue an onboarding or invitation email to the invited user's email address.

## USER-ONBOARD-DELIVERY-003: Self-Registration Email

IF self-registration is enabled

WHEN a user account is created or activated through self-registration

THEN the system SHALL queue an onboarding email to the registered user's email address.

## USER-ONBOARD-DELIVERY-004: Reliable Email Queue

IF an onboarding email is queued

WHEN the reliable email system accepts the email

THEN the system SHALL create an outbound email record.

## USER-ONBOARD-DELIVERY-005: Retry Behavior

IF onboarding email delivery fails transiently

WHEN the reliable email system processes retries

THEN the system SHALL follow existing outbound email retry behavior.

## USER-ONBOARD-DELIVERY-006: Invalid Email Behavior

IF onboarding email delivery fails because the address is invalid

WHEN the reliable email system records the failure

THEN the system SHALL follow existing invalid email handling behavior.

## USER-ONBOARD-DELIVERY-007: Admin Feedback

IF user creation succeeds but onboarding email queueing fails

WHEN the admin submits the create-user form

THEN the system SHALL communicate that the user was created but the onboarding email was not queued.

## USER-ONBOARD-DELIVERY-008: Audit Metadata

IF an onboarding email is queued

WHEN the queue record is created

THEN the system SHALL audit or include metadata for the onboarding source, actor when available, target user or invited email, and timestamp.

## USER-ONBOARD-DELIVERY-009: Sender Address

IF an onboarding email is sent

WHEN the email payload is built

THEN the email SHALL use `noreply@rollfinders.com` as the sender and `support@rollfinders.com` as the reply-to address unless a specific business workflow requires `business@rollfinders.com`.

---

# Acceptance Criteria

* Admin-created users receive onboarding emails.
* Academy invited users receive invitation/onboarding emails.
* Self-registered users receive onboarding emails if self-registration is enabled.
* Outbound email records are created for queued onboarding emails.
* Existing retry and invalid-email behavior is preserved.
* Admin-created user workflows show success or email failure feedback.
* Onboarding queue metadata is auditable and does not include plaintext passwords.
