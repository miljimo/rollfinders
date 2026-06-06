# PRD: Admin User Onboarding Credential Content

Version: 1.0

Priority: High

Review date: 2026-06-06

---

# Objective

Define the credential and login content for onboarding emails sent to admin-created users.

---

# Scope

In scope:

* Include login email/username.
* Include login URL.
* Include either a temporary password or first-login setup link.
* Instruct the user to change or set their password.
* Protect plaintext credentials from logs, audits, API responses, and database records.

Out of scope:

* Queueing, retry, and admin feedback behavior. See `AdminUserOnboardingEmailDeliveryPrd.md`.
* Bulk user import.
* Multi-factor authentication.
* Replacing password reset flow.

---

# Required Email Content

The onboarding email must include:

* Login URL.
* Username/login email.
* Temporary password or first-login setup link.
* Instruction to change or set password.
* Support/contact guidance.

Suggested subject:

`Your RollFinder account has been created`

---

# IF/WHEN/THEN Requirements

## ONBOARD-CONTENT-001: Include Login Email

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the created user's email address as the login username.

---

## ONBOARD-CONTENT-002: Include Login URL

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL include the RollFinder login URL.

---

## ONBOARD-CONTENT-003: Credential Approach Decision

IF implementation begins

WHEN the engineer starts the work

THEN the team SHALL document whether onboarding uses raw temporary passwords or first-login setup links.

Done when:

* Decision is recorded in the PR or implementation notes.
* Decision does not weaken existing password reset behavior.

---

## ONBOARD-CONTENT-004: Temporary Password Content

IF the admin-created user flow uses raw temporary passwords

WHEN the onboarding email is generated

THEN the system SHALL include the temporary password in the email body.

---

## ONBOARD-CONTENT-005: First-Login Link Alternative

IF the product chooses a first-login setup link instead of emailing a raw temporary password

WHEN the onboarding email is generated

THEN the system SHALL include a single-use password setup/reset link.

---

## ONBOARD-CONTENT-006: Password Hashing

IF a temporary password is used

WHEN the user is stored

THEN the system SHALL store only the hashed password.

---

## ONBOARD-CONTENT-007: Plaintext Password Protection

IF a temporary password is used

WHEN logs, audit records, API responses, or database records are written

THEN the system SHALL NOT include the plaintext temporary password.

---

## ONBOARD-CONTENT-008: Change Password Instruction

IF an onboarding email is generated

WHEN the email body is built

THEN the system SHALL instruct the user to change or set their password as soon as possible.

---

## ONBOARD-CONTENT-009: Created User Can Log In

IF a user receives valid onboarding credentials or a setup link

WHEN the user follows the email instructions

THEN the user SHALL be able to authenticate according to their assigned role and status.

---

# Acceptance Criteria

* Email includes login URL and login email.
* Email includes temporary password or setup link.
* Email instructs password change/setup.
* Plaintext password is not logged or audited.
* Created user can log in.
