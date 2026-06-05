# PRD: LogoutButton Component

## Implementation Metadata

- Source: `src/components/LogoutButton.tsx`
- Status: Ready for development

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

IF sign-out is triggered from a header  
WHEN the control renders  
THEN styling SHALL remain visually consistent with adjacent navigation actions.

## Done When

* Logout signs out through NextAuth.
* Button remains styled like header nav controls.
* Button has `type="button"`.
