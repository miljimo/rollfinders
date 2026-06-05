# PRD: Dashboard Password Page

Route: `/dashboard/password`

Source: `src/app/dashboard/password/page.tsx`

## Purpose

Allow authenticated users to change their password.

## Requirements

IF authenticated user opens password page  
WHEN page renders  
THEN change password form SHALL be shown.

IF user submits invalid password data  
WHEN server action returns  
THEN validation feedback SHALL be shown.

IF password change succeeds  
WHEN response returns  
THEN success feedback SHALL be shown.

## Done When

* Page is protected.
* Password inputs are secure.
* Feedback is clear.
