# PRD: Admin-Created User Onboarding Email

Version: 1.0

Priority: High

Review date: 2026-06-04

---

# Implementation Branch

Use branch:

`feature/admin-created-user-onboarding-email`

---

# User Story

As an admin, when I add users, I want an email to be sent to the users with the temporary password and username to log in with.

---

# Scope

In scope:

* Send onboarding email after successful admin-created user creation.
* Include login email/username.
* Include temporary password or first-login setup link.
* Include login URL.
* Instruct user to change or set password.
* Use existing reliable email delivery.
* Preserve existing `/admin/users` UI flow.
* Audit user creation and onboarding email queueing.

Out of scope:

* Bulk user import.
* Self-registration.
* Multi-factor authentication.
* Replacing password reset flow.
* Replacing admin user management page.
* Sending onboarding emails when existing users are edited.
* Academy claim approval emails.

---

# Existing Flow Constraint

The implementation must preserve:

* Existing `/admin/users` create-user form.
* Existing role and academy assignment rules.
* Existing protected super-admin safeguards.
* Existing user table, filters, pagination, and actions.
* Existing password reset email action.
* Existing reliable outbound email queue.

---

# Required Email Content

The onboarding email must include:

* Login URL
* Username/login email
* Temporary password or first-login setup link
* Instruction to change or set password
* Support/contact guidance

Suggested subject:

`Your RollFinder account has been created`

---

# IF/WHEN/THEN Requirements

## Requirement 1: Queue Onboarding Email

IF an authorized admin creates a user

WHEN the user record is created successfully

THEN the system SHALL queue an onboarding email to the created user's email address.

Acceptance criteria:

* Email is queued only after the user exists.
* Email uses the existing reliable email delivery system.
* Unauthorized users cannot trigger onboarding emails.

---

## Requirement 2: Include Login Email

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the created user's email address as the login username.

---

## Requirement 3: Include Login URL

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the RollFinder login URL.

---

## Requirement 4: Include First-Login Credential

IF the admin-created user flow uses raw temporary passwords

WHEN the onboarding email is generated

THEN the system SHALL include the temporary password in the email body.

---

## Requirement 5: First-Login Link Alternative

IF the product chooses a first-login setup link instead of emailing a raw temporary password

WHEN the onboarding email is generated

THEN the system SHALL include a single-use password setup/reset link.

---

## Requirement 6: Credential Approach Decision

IF implementation begins

WHEN the engineer starts the branch

THEN the team SHALL document whether onboarding uses raw temporary passwords or first-login setup links.

Acceptance criteria:

* Decision is recorded in the PR or implementation notes.
* Decision does not weaken existing password reset behavior.

---

## Requirement 7: Password Hashing

IF a temporary password is used

WHEN the user is stored

THEN the system SHALL store only the hashed password.

---

## Requirement 8: Plaintext Password Protection

IF a temporary password is used

WHEN logs, audit records, API responses, or database records are written

THEN the system SHALL NOT include the plaintext temporary password.

---

## Requirement 9: Change Password Instruction

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL instruct the user to change or set their password as soon as possible.

---

## Requirement 10: Admin Success Feedback

IF user creation and email queueing both succeed

WHEN the admin returns to the user management page

THEN the system SHOULD show confirmation that the user was created and the onboarding email was queued.

---

## Requirement 11: Email Queue Failure Feedback

IF user creation succeeds but onboarding email queueing fails

WHEN the admin submits the create-user form

THEN the system SHALL communicate that the user was created but the onboarding email was not queued.

---

## Requirement 12: Email Delivery Record

IF an onboarding email is queued

WHEN the reliable email system accepts the email

THEN the system SHALL create an outbound email record.

---

## Requirement 13: Email Retry Behavior

IF onboarding email delivery fails transiently

WHEN the reliable email system processes retries

THEN the system SHALL follow existing outbound email retry behavior.

---

## Requirement 14: Invalid Email Behavior

IF onboarding email delivery fails because the address is invalid

WHEN the reliable email system records the failure

THEN the system SHALL follow existing invalid email handling behavior.

---

## Requirement 15: Audit User Creation

IF an admin creates a user

WHEN the user record is saved

THEN the system SHALL audit the user creation action.

---

## Requirement 16: Audit Email Queue

IF an onboarding email is queued

WHEN the queue record is created

THEN the system SHALL audit or include metadata that the onboarding email was queued.

Acceptance criteria:

* Audit metadata includes actor, target user ID, target email, and timestamp.
* Audit metadata does not include plaintext passwords.

---

## Requirement 17: Preserve Password Reset Action

IF onboarding email functionality is implemented

WHEN an admin later sends a password reset email

THEN the existing password reset email action SHALL still work.

---

## Requirement 18: Created User Can Log In

IF a user receives valid onboarding credentials or a setup link

WHEN the user follows the email instructions

THEN the user SHALL be able to authenticate according to their assigned role and status.

---

# Launch Checklist

* Admin-created user queues onboarding email.
* Email includes login URL and login email.
* Email includes temporary password or setup link.
* Email instructs password change/setup.
* Plaintext password is not logged or audited.
* Outbound email record is created.
* Admin sees success or email failure feedback.
* Existing password reset action still works.
* Created user can log in.

---

# Open Questions

* Should RollFinder email raw temporary passwords or use first-login setup links?
* Should users be forced to change a temporary password on first login?
* Should admins enter temporary passwords or should the system generate them?
* Should email queue failure roll back user creation or create the user with a warning?
