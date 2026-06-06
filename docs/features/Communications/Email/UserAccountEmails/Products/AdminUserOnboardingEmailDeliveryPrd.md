# PRD: Admin User Onboarding Email Delivery

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Queue an onboarding email after an authorized admin creates a user, while preserving the existing `/admin/users` workflow and reliable outbound email system.

---

# Scope

In scope:

* Queue onboarding email after successful admin-created user creation.
* Use the existing reliable email delivery system.
* Create outbound email records.
* Show admin feedback when email queueing succeeds or fails.
* Audit user creation and onboarding email queueing metadata.

Out of scope:

* Email body credential rules. See `AdminUserOnboardingCredentialContentPrd.md`.
* Bulk user import.
* Self-registration.
* Academy claim approval emails.
* Replacing the password reset flow.

---

# Existing Flow Constraint

The implementation must preserve:

* Existing `/admin/users` create-user form.
* Existing role and academy assignment rules.
* Existing protected super-admin safeguards.
* Existing user table, filters, pagination, and actions.
* Existing password reset email action.

---

# IF/WHEN/THEN Requirements

## ONBOARD-DELIVERY-001: Queue After User Creation

IF an authorized admin creates a user

WHEN the user record is created successfully

THEN the system SHALL queue an onboarding email to the created user's email address.

Done when:

* Email is queued only after the user exists.
* Email uses the existing reliable email delivery system.
* Unauthorized users cannot trigger onboarding emails.

---

## ONBOARD-DELIVERY-002: Outbound Email Record

IF an onboarding email is queued

WHEN the reliable email system accepts the email

THEN the system SHALL create an outbound email record.

---

## ONBOARD-DELIVERY-003: Retry Behavior

IF onboarding email delivery fails transiently

WHEN the reliable email system processes retries

THEN the system SHALL follow existing outbound email retry behavior.

---

## ONBOARD-DELIVERY-004: Invalid Email Behavior

IF onboarding email delivery fails because the address is invalid

WHEN the reliable email system records the failure

THEN the system SHALL follow existing invalid email handling behavior.

---

## ONBOARD-DELIVERY-005: Admin Success Feedback

IF user creation and email queueing both succeed

WHEN the admin returns to the user management page

THEN the system SHOULD show confirmation that the user was created and the onboarding email was queued.

---

## ONBOARD-DELIVERY-006: Email Queue Failure Feedback

IF user creation succeeds but onboarding email queueing fails

WHEN the admin submits the create-user form

THEN the system SHALL communicate that the user was created but the onboarding email was not queued.

---

## ONBOARD-DELIVERY-007: Audit User Creation

IF an admin creates a user

WHEN the user record is saved

THEN the system SHALL audit the user creation action.

---

## ONBOARD-DELIVERY-008: Audit Email Queue

IF an onboarding email is queued

WHEN the queue record is created

THEN the system SHALL audit or include metadata that the onboarding email was queued.

Done when:

* Audit metadata includes actor, target user ID, target email, and timestamp.
* Audit metadata does not include plaintext passwords.

---

# Acceptance Criteria

* Admin-created user queues onboarding email.
* Outbound email record is created.
* Admin sees success or email failure feedback.
* User creation and email queueing are auditable.
* Existing password reset action still works.
