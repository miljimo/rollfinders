# PRD: Forgot Password & Password Reset

## Branch

`feature/forgot_password_reset`

## Objective

Allow users to reset their password securely when they forget it.

## User Flow

1. User clicks `Forgot password?` on the login page.
2. User enters their email address.
3. System sends a password reset email if the email exists.
4. User clicks the reset link.
5. User enters a new password.
6. System updates the password.
7. User can log in with the new password.

## UI Requirements

### Login Page

Route:

`/login`

Add a link below the password field:

`Forgot password?`

The link SHALL navigate to `/forgot-password`.

### Forgot Password Page

Route:

`/forgot-password`

Fields:

* Email

Button:

`Send reset link`

Success message:

`If an account exists for this email, a password reset link has been sent.`

Requirements:

* The page SHALL use the same compact, mobile-safe visual structure as the login page.
* The email field SHALL use `type="email"`, require a value, and support mobile email keyboard behavior.
* The success message SHALL be generic for known and unknown email addresses.
* The page SHALL not show user existence, role, status, or account state.

### Reset Password Page

Route:

`/reset-password?token=...`

Current compatible route:

`/reset-password/[token]`

Fields:

* New Password
* Confirm Password

Button:

`Reset Password`

Success message:

`Your password has been reset successfully. You can now sign in.`

Requirements:

* The page SHALL validate the token before allowing a password change.
* The page SHALL show a clear invalid or expired token state without exposing account details.
* The page SHALL provide a return-to-login path after a successful password reset.

## Security Requirements

* Do not reveal whether an email exists.
* Reset token must be unique.
* Reset token must expire.
* Token must be single-use.
* Store only the hashed token.
* New password must follow password policy.
* Password and confirm password must match.
* Existing login flow must not break.
* Reset requests SHOULD be rate-limited by email and client signal where platform rate limiting is available.
* Completing a reset SHALL invalidate the used token.

## Email Requirements

Email subject:

`Reset your RollFinders password`

Email body must include:

* User greeting
* Reset password link
* Expiry warning
* Security note

The reset email SHALL render as a RollFinders HTML email with a plain-text fallback.

Required security note:

`If you did not request this password reset, you can safely ignore this email.`

## Password Changed Notification Requirements

IF a user successfully changes their password through the reset password page or dashboard password settings

WHEN the password hash has been updated

THEN the system SHALL send a password-changed notification email to the user's account email address.

AND the email SHALL use the same RollFinders HTML email style as the password reset email with a plain-text fallback.

AND the email SHALL include the username/email and a fresh password reset link.

AND the email SHALL NOT include the submitted password or any plaintext password value.

AND the email SHALL state that passwords are not sent by email.

## Database Requirements

Create password reset token storage when it does not already exist:

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Current implementation compatibility:

* Existing Prisma storage MAY use string IDs instead of UUID database defaults.
* `token_hash` SHALL be unique.
* `user_id` and `expires_at` SHALL be indexed.
* Token rows SHALL be linked to users with cascade delete behavior.

## API Requirements

### Request Reset

Preferred route:

`POST /api/auth/forgot-password`

Current compatible route:

`POST /api/auth/password/reset/request`

Payload:

```json
{
  "email": "user@example.com"
}
```

Response must always be generic:

```json
{
  "success": true
}
```

Requirements:

* If the email belongs to an active account, the API SHALL queue a password reset email.
* The system SHALL immediately attempt delivery after queueing the reset email.
* If the email does not belong to an active account, the API SHALL return the same generic response.
* The API SHALL not reveal whether the account exists, is disabled, or has a specific role.

### Reset Password

Preferred route:

`POST /api/auth/reset-password`

Current compatible route:

`POST /api/auth/password/reset/confirm`

Payload:

```json
{
  "token": "reset-token",
  "password": "newPassword",
  "confirmPassword": "newPassword"
}
```

Requirements:

* The API SHALL reject missing, invalid, expired, or already-used tokens.
* The API SHALL reject passwords that do not satisfy password policy.
* The API SHALL reject mismatched `password` and `confirmPassword`.
* The API SHALL update the user's password hash only after token and password validation pass.
* The API SHALL mark the token as used after successful password update.
* The system SHALL queue and immediately attempt to send a password-changed notification after a successful password update.

## Acceptance Criteria

IF a user forgets their password

WHEN they provide their email

THEN a reset email SHALL be sent if the account exists.

IF the email does not exist

WHEN the user submits the forgot-password form

THEN the system SHALL still show the same success message.

IF the token is expired, invalid, or already used

WHEN the user submits a new password

THEN the password SHALL NOT be reset.

IF the token is valid

WHEN the user submits matching passwords that satisfy policy

THEN the user SHALL be able to create a new password.

IF password reset succeeds

WHEN the user returns to login

THEN the user SHALL be able to sign in with the new password.

No existing login functionality SHALL be broken.

## Related Documents

* `docs/features/Communications/Email/UserAccountEmails/APIs/UserPasswordResetApi.md`
* `docs/features/Users/Standard/Pages/LoginPage.md`
* `docs/features/Users/Standard/Pages/ResetPasswordPage.md`
* `docs/features/Users/Standard/Components/LoginForm.md`
