# PRD: Admin User Password Reset API

Version: 1.0

Route: `POST /api/admin/users/[id]/password-reset`

Source: `src/app/api/admin/users/[id]/password-reset/route.ts`

---

# Objective

Allow authorized admins to queue password reset emails for permitted user accounts.

---

# IF/WHEN/THEN Requirements

## USER-PWRESET-001: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/password-reset`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-PWRESET-002: Target Exists

IF an admin requests password reset for a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-PWRESET-003: Permission Scope

IF an admin requests password reset for a user outside their management scope

WHEN the API checks permissions

THEN the API SHALL return HTTP 403.

## USER-PWRESET-004: Protected Super Admin Safeguard

IF the target is a protected super admin account

WHEN the requester is not allowed to manage protected super admins

THEN the API SHALL reject the request according to existing protected-account rules.

## USER-PWRESET-005: Queue Password Reset Email

IF an authorized admin requests password reset for a permitted user

WHEN email queuing succeeds

THEN the API SHALL queue a password reset email and return `{ "ok": true, "expiresAt": "<timestamp>" }`.

## USER-PWRESET-006: Audit Logging

IF a password reset email is queued

WHEN the operation succeeds

THEN the API SHALL write an admin audit log entry with the target user and expiration timestamp.

---

# Acceptance Criteria

* Unauthorized users cannot queue password reset emails.
* Role and academy scope are enforced.
* Successful queue returns `ok` and `expiresAt`.
* Plaintext credentials are not returned.
* Successful queue is audit logged.
