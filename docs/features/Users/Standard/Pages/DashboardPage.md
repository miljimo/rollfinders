# PRD: User Dashboard Page

Route: `/dashboard`

Source: `src/app/dashboard/page.tsx`

## Purpose

Provide the standard-user version of the unified dashboard experience.

## Requirements

IF authenticated user opens dashboard  
WHEN dashboard data loads  
THEN page SHALL show role-appropriate summary and navigation.

AND `/dashboard` SHALL be the canonical dashboard route for Standard Users.

IF authenticated Standard User opens dashboard
WHEN the page renders
THEN the layout SHALL visually align with the admin dashboard shell where practical.

AND the navigation SHALL only show standard-user destinations.

AND the user SHALL be able to view academy rolls in read-only mode.

IF unauthenticated user opens dashboard  
WHEN authorization runs  
THEN user SHALL be redirected to login.

IF user role has admin dashboard instead  
WHEN routing occurs  
THEN navigation SHALL follow existing role rules.

## Done When

* Standard user dashboard is protected.
* Page links work.
* Layout is responsive.
* Standard users see only academy-scoped read-only roll data.
* Standard users cannot see admin-only actions or panels.
