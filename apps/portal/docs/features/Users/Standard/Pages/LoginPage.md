# PRD: Login Page

Route: `/login`

Source: `src/app/login/page.tsx`

Related component requirement: `apps/portal/docs/features/Users/Standard/Components/LoginForm.md`

## Purpose

Allow users to authenticate.

## Requirements

IF user opens login page  
WHEN not authenticated  
THEN page SHALL show the login form according to `apps/portal/docs/features/Users/Standard/Components/LoginForm.md`.

IF user opens login page on a mobile viewport  
WHEN the public shell renders  
THEN the page SHALL show a left-aligned `Login` heading, horizontal page padding, and no horizontal overflow at `375x812`.

IF user opens login page on a desktop viewport  
WHEN the public header navigation is visible  
THEN the page SHALL keep the login content in a narrow centered column with balanced top spacing.

IF authenticated user opens login page  
WHEN session exists  
THEN page MAY redirect according to existing auth behavior.

IF login fails  
WHEN credentials are rejected  
THEN user SHALL see error feedback.

## Done When

* Email/password fields are present.
* Form is keyboard accessible.
* Mobile viewport has no horizontal overflow.
* Desktop layout keeps the form compact and centered.
* Successful auth redirects correctly.
