# PRD: Login Page

Route: `/login`

Source: `src/app/login/page.tsx`

## Purpose

Allow users to authenticate.

## Requirements

IF user opens login page  
WHEN not authenticated  
THEN page SHALL show login form.

IF authenticated user opens login page  
WHEN session exists  
THEN page MAY redirect according to existing auth behavior.

IF login fails  
WHEN credentials are rejected  
THEN user SHALL see error feedback.

## Done When

* Email/password fields are present.
* Form is keyboard accessible.
* Successful auth redirects correctly.
