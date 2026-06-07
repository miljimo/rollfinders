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

IF authenticated Standard User opens the Dashboard panel
WHEN academy rolls are displayed
THEN the page title SHALL use the assigned academy name.

AND rolls SHALL be searchable within the assigned academy.

AND rolls SHALL be paginated.

AND rolls SHALL be ordered by nearest upcoming occurrence first.

IF authenticated Standard User opens the Profile panel
WHEN profile data loads
THEN the page SHALL display user information and academy information.

IF authenticated Standard User opens the Settings panel
WHEN settings actions load
THEN the page SHALL expose Change Password using the existing password functionality.

AND the page SHALL expose Edit Profile only for user-changeable fields.

AND clicking Change Password SHALL render only the Change Password form in the settings detail panel.

AND clicking Edit Profile SHALL render only the Edit Profile form in the settings detail panel.

AND fields that are not user-changeable SHALL be shown as read-only when present.

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
* Standard user Dashboard, Profile, and Settings panels match the Standard User shared dashboard PRD.
