# PRD: User Password Reset API

Version: 1.0

Routes:

- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`
- `POST /api/admin/users/[id]/password/reset`

Sources:

- `src/app/api/auth/password/reset/request/route.ts`
- `src/app/api/auth/password/reset/confirm/route.ts`
- `src/app/api/admin/users/[id]/password/reset/route.ts`

---

# Objective

Allow any user to request and complete password reset securely, and allow authorized admins to queue password reset emails for permitted user accounts.

---

# IF/WHEN/THEN Requirements

## USER-PWRESET-001: Self-Service Reset Request

IF a user requests a password reset for their own email address

WHEN the email belongs to an active account

THEN the API SHALL queue a password reset email without exposing account details to unauthenticated clients.

## USER-PWRESET-002: Unknown Email Privacy

IF a password reset is requested for an unknown email address

WHEN the API responds

THEN the API SHALL return a generic response that does not reveal whether the account exists.

## USER-PWRESET-003: Reset Token Confirmation

IF a user opens a password reset link

WHEN the token is valid and unexpired

THEN the API SHALL allow the user to set a new password and invalidate the token after successful use.

## USER-PWRESET-004: Invalid Token Handling

IF a user submits an invalid, expired, or already-used reset token

WHEN the API validates the token

THEN the API SHALL reject the password change without revealing sensitive account state.

## USER-PWRESET-005: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/password/reset`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-PWRESET-006: Admin Target Exists

IF an admin requests password reset for a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-PWRESET-007: Admin Permission Scope

IF an admin requests password reset for a user outside their management scope

WHEN the API checks permissions

THEN the API SHALL return HTTP 403.

## USER-PWRESET-008: Protected Super Admin Safeguard

IF the target is a protected super admin account

WHEN the requester is not allowed to manage protected super admins

THEN the API SHALL reject the request according to existing protected-account rules.

## USER-PWRESET-009: Queue Password Reset Email

IF a reset request is valid

WHEN email queuing succeeds

THEN the API SHALL queue a password reset email and return `{ "ok": true, "expiresAt": "<timestamp>" }`.

## USER-PWRESET-010: Audit Logging

IF an admin-triggered password reset email is queued

WHEN the operation succeeds

THEN the API SHALL write an admin audit log entry with the target user and expiration timestamp.

---

# Acceptance Criteria

* Any user can request a password reset for their own account without account enumeration risk.
* Valid reset tokens allow one successful password change.
* Invalid, expired, or used tokens are rejected.
* Unauthorized admins cannot queue password reset emails for other users.
* Admin role and academy scope are enforced.
* Successful admin queue returns `ok` and `expiresAt`.
* Plaintext credentials are not returned.
* Successful admin-triggered queue is audit logged.
