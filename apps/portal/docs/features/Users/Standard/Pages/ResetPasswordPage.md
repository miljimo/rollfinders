# PRD: Reset Password Page

Route: `/reset-password/[token]`

Source: `src/app/reset-password/[token]/page.tsx`

## Purpose

Allow users with valid reset tokens to set a new password.

## Requirements

IF token is valid  
WHEN page renders  
THEN reset password form SHALL be shown.

IF token is invalid or expired  
WHEN page validates token  
THEN error state SHALL be shown.

IF password reset succeeds  
WHEN form submits  
THEN success feedback and next-login path SHALL be shown.

## Done When

* Password form is secure.
* Invalid token states are clear.
* User can return to login.
