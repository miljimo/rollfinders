# PRD: LogoutButton Component

Source: `src/components/LogoutButton.tsx`

## Purpose

Provide a reusable sign-out control.

## Requirements

IF a logged-in user clicks Logout  
WHEN the click handler runs  
THEN the component SHALL call `signOut` with `callbackUrl: "/"`.

IF the button renders  
WHEN keyboard users navigate to it  
THEN it SHALL be reachable and operable as a native button.

IF sign-out completes  
WHEN the redirect occurs  
THEN the user SHALL land on `/`.

## Done When

* Logout signs out through NextAuth.
* Button remains styled like header nav controls.
* Button has `type="button"`.
