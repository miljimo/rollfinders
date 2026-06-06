# PRD: LoginForm Component

## Implementation Metadata

- Source: `src/app/login/LoginForm.tsx`
- Parent page: `src/app/login/page.tsx`
- Route: `/login`
- Status: Ready for development

## Purpose

Allow users to enter account credentials from a mobile-first login form that remains compact, accessible, and brand-aligned across mobile and desktop.

## Requirements

IF the login page renders  
WHEN the user is not authenticated  
THEN `LoginForm` SHALL render inside a compact bordered white form surface with a subtle shadow below a left-aligned `Login` heading.

IF the form renders on a narrow mobile viewport  
WHEN the public header and footer are visible  
THEN the page SHALL fit within the viewport with horizontal page padding and no clipped controls, overlapping text, or horizontal scrolling.

IF the form renders on a desktop viewport  
WHEN the public header navigation is visible  
THEN the login content SHALL remain centered in a narrow column and SHALL NOT stretch across the page.

IF the form fields render  
WHEN the user enters credentials  
THEN the form SHALL show visible labels for email and password, full-width fields, and a full-width `Sign In` submit action.

IF the email input renders  
WHEN the browser evaluates the field  
THEN it SHALL use `type="email"`, require a value, and support mobile email keyboard behavior.

IF the password input renders  
WHEN the browser evaluates the field  
THEN it SHALL use password masking by default, require a value, and provide an accessible password visibility toggle.

IF the submit action renders  
WHEN the user views the mobile form  
THEN the action SHALL use the primary RollFinders action style, span the full form width, and have a minimum touch target height of 44px.

IF the user submits the form  
WHEN sign-in is pending  
THEN fields and submit action SHALL be disabled and the submit action SHALL communicate pending progress.

IF authentication fails  
WHEN credentials are rejected or account access is blocked  
THEN the form SHALL show visible error feedback without removing the entered field labels.

IF error feedback renders  
WHEN assistive technology observes the form  
THEN the error message SHALL use alert or live-region semantics and long account-access messages SHALL wrap without clipping on mobile.

IF authentication succeeds  
WHEN the current auth flow resolves the user session  
THEN the form SHALL redirect according to the existing role-based login behavior.

IF a forgot-password action is considered  
WHEN no public request-reset route exists  
THEN the form SHALL NOT show a `Forgot password?` link in this iteration.

## Done When

* Mobile layout matches the approved refined direction: calmer header action, readable logo, left-aligned heading, compact form card, soft inputs, teal primary submit action, and readable footer.
* Email and password inputs are keyboard accessible and labelled.
* Password visibility toggle has an accessible name and does not reduce the input touch target.
* Inputs and submit action show visible focus states.
* Pending submission disables repeated sign-in attempts.
* Error feedback is visible and readable on mobile.
* Successful login keeps the current role-based redirects.
