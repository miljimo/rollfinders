# PRD: User Password Reset API

Version: 1.0

Routes:

- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`
- `POST /api/admin/users/[id]/password-reset`

Sources:

- `src/app/api/auth/password/reset/request/route.ts`
- `src/app/api/auth/password/reset/confirm/route.ts`
- `src/app/api/admin/users/[id]/password-reset/route.ts`

---

# Objective

Allow any user to request and complete password reset securely, allow platform admins and super admins to request password reset emails for permitted lower user accounts through the same reset request service, and notify users when their password changes without exposing plaintext credentials.

---

# IF/WHEN/THEN Requirements

## USER-PWRESET-001: Self-Service Reset Request

IF a user requests a password reset for their own email address

WHEN the email belongs to an active account

THEN the API SHALL queue a password reset email without exposing account details to unauthenticated clients.

AND the email SHALL use the approved RollFinders HTML password reset template with a plain-text fallback.

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

IF a user calls `POST /api/admin/users/[id]/password-reset`

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

## USER-PWRESET-007A: Super Admin Lower-User Reset Scope

IF a `SUPER_ADMIN` requests password reset for another user

WHEN the target is a lower role such as `PLATFORM_ADMIN`, `ACADEMY_ADMIN`, or `STANDARD_USER`

THEN the API SHALL allow the request when the target account exists and is eligible for password reset.

AND the API SHALL NOT allow the request for the protected Super Admin account.

## USER-PWRESET-007B: Platform Admin Lower-User Reset Scope

IF a `PLATFORM_ADMIN` requests password reset for another user

WHEN the target is a lower user they are allowed to manage, such as `ACADEMY_ADMIN` or `STANDARD_USER`

THEN the API SHALL allow the request when the target account exists and is eligible for password reset.

AND the API SHALL reject requests for `PLATFORM_ADMIN`, `SUPER_ADMIN`, legacy `ADMIN`, protected Super Admin, or otherwise hidden elevated accounts.

## USER-PWRESET-008: Protected Super Admin Safeguard

IF the target is a protected super admin account

WHEN the requester is not allowed to manage protected super admins

THEN the API SHALL reject the request according to existing protected-account rules.

## USER-PWRESET-009: Queue Password Reset Email

IF a reset request is valid

WHEN email queuing succeeds

THEN the API SHALL queue and immediately attempt to send a password reset email.

AND admin reset endpoints SHALL use the same reset request service used by the login forgot-password flow.

AND the API SHALL return `{ "ok": true, "expiresAt": "<timestamp>" }`.

## USER-PWRESET-010: Audit Logging

IF an admin-triggered password reset email is queued

WHEN the operation succeeds

THEN the API SHALL write an admin audit log entry with the target user and expiration timestamp.

## USER-PWRESET-010A: Admin UI Feedback

IF an admin triggers `Send Password Reset` from the dashboard Users panel

WHEN the shared reset request service completes successfully

THEN the dashboard SHALL return to the Users panel and show visible success feedback.

IF the shared reset request service fails

WHEN the dashboard receives the failure state

THEN the dashboard SHALL show visible failure feedback.

## USER-PWRESET-011: Password Changed Notification

IF a user password is changed through reset-token confirmation or self-service dashboard password change

WHEN the password hash has been updated successfully

THEN the system SHALL queue and immediately attempt to send a password-changed notification email to the user's account email.

AND the email SHALL use the same RollFinders HTML email style as password reset emails with a plain-text fallback.

AND the email SHALL include the username/email and a fresh reset link.

AND the email SHALL NOT include the user's plaintext password.

AND the email SHALL explicitly state that passwords are not sent by email.

---

# Acceptance Criteria

* Any user can request a password reset for their own account without account enumeration risk.
* Valid reset tokens allow one successful password change.
* Invalid, expired, or used tokens are rejected.
* Unauthorized admins cannot queue password reset emails for other users.
* Super admins can queue password reset emails for lower user roles, excluding protected Super Admin.
* Platform admins can queue password reset emails only for lower manageable users.
* Platform admins cannot queue password reset emails for peer Platform Admins, Super Admins, legacy Admins, or protected Super Admin.
* Admin role and academy scope are enforced.
* Successful admin queue returns `ok` and `expiresAt`.
* Plaintext credentials are not returned.
* Password reset and password-changed email bodies do not include plaintext passwords.
* Password-changed notifications include a secure reset link for account recovery.
* Successful admin-triggered queue is audit logged.
