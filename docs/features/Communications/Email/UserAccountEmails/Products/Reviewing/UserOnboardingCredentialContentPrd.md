# PRD: User Onboarding Credential Content

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Define the login, credential, and setup content for onboarding emails sent to all user types.

---

# Scope

In scope:

* Admin-created users.
* Academy invited users.
* Self-registered users if self-registration is enabled.
* User role and next-action guidance.
* Login URL, setup link, and support guidance.
* Plaintext credential protection.

Out of scope:

* Queueing, retry, and admin feedback behavior. See `UserOnboardingEmailDeliveryPrd.md`.
* Marketing email content.
* Multi-factor authentication.
* Replacing password reset flow.

---

# Required Email Content

The onboarding email must include:

* Login URL or invitation acceptance URL.
* Login email/username.
* First-login setup link, password setup link, invitation acceptance link, or temporary credential only when explicitly required.
* Role or context where useful, such as platform admin, academy admin, academy team member, or standard user.
* Instruction to set or change password when applicable.
* Support/contact guidance using `support@rollfinders.com`.

---

# IF/WHEN/THEN Requirements

## USER-ONBOARD-CONTENT-001: Include Login Email

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the user's email address as the login username.

## USER-ONBOARD-CONTENT-002: Include Entry URL

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the correct login, invitation acceptance, or account setup URL for the onboarding source.

## USER-ONBOARD-CONTENT-003: Onboarding Source Context

IF a user's onboarding source has specific context

WHEN the email body is built

THEN the email SHOULD describe the relevant context, such as admin-created account, academy team invitation, or self-registration confirmation.

## USER-ONBOARD-CONTENT-004: Credential Approach

IF implementation begins for a user onboarding path

WHEN the engineer starts the work

THEN the team SHALL document whether that path uses a temporary password, first-login setup link, password reset link, or invitation acceptance link.

## USER-ONBOARD-CONTENT-005: First-Login Link Preference

IF a user needs to establish a password

WHEN the onboarding email is generated

THEN the system SHOULD use a single-use setup or password reset link instead of emailing a raw temporary password.

## USER-ONBOARD-CONTENT-006: Temporary Password Content

IF a user onboarding path explicitly uses a raw temporary password

WHEN the onboarding email is generated

THEN the system SHALL include the temporary password in the email body only for that email.

## USER-ONBOARD-CONTENT-007: Password Hashing

IF a temporary password is used

WHEN the user is stored

THEN the system SHALL store only the hashed password.

## USER-ONBOARD-CONTENT-008: Plaintext Credential Protection

IF temporary credentials or setup links are generated

WHEN logs, audit records, API responses, or database records are written

THEN the system SHALL NOT include plaintext temporary passwords or reusable credential material.

## USER-ONBOARD-CONTENT-009: Change Password Instruction

IF an onboarding email includes a temporary password or setup link

WHEN the email body is built

THEN the system SHALL instruct the user to change or set their password as soon as possible.

## USER-ONBOARD-CONTENT-010: User Can Complete Onboarding

IF a user receives a valid onboarding email

WHEN the user follows the email instructions

THEN the user SHALL be able to complete onboarding according to their assigned role, account status, and invitation state.

---

# Acceptance Criteria

* Email includes the user's login email.
* Email includes the correct login, invitation, or setup URL.
* Email explains the onboarding source where useful.
* Setup links are preferred over raw temporary passwords.
* Plaintext passwords are not logged, audited, or stored.
* User can complete onboarding according to role and account status.
