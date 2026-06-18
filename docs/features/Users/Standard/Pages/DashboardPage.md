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

AND the layout SHALL be mobile-first, with desktop rendering as a responsive expansion of the mobile hierarchy.

AND the navigation SHALL only show standard-user destinations.

AND the user SHALL be able to view academy rolls in read-only mode.

IF authenticated Standard User opens the Dashboard panel
WHEN academy rolls are displayed
THEN the page title SHALL use the assigned academy name.

AND current or upcoming events at the assigned academy SHALL be shown before lower-priority roll list content when event data exists.

AND academy events SHALL be scoped only to the authenticated user's assigned academy.

AND event actions SHALL be read-only unless the user has an explicit event-management permission.

AND rolls SHALL be searchable within the assigned academy.

AND rolls SHALL be paginated.

AND rolls SHALL be ordered by nearest upcoming occurrence first.

IF authenticated Standard User opens the Profile panel
WHEN profile data loads
THEN the page SHALL display user information and academy information.

AND the page SHALL use the mobile-first reusable `UserProfile` experience.

AND the profile SHOULD include current belt or rank, practitioner verification, belt journey, and current academy events when reliable data exists.

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
* Dashboard and Profile are mobile-first.
* Standard users see only academy-scoped read-only roll data.
* Standard users see only assigned-academy current events.
* Standard users cannot see admin-only actions or panels.
* Standard user Dashboard, Profile, and Settings panels match the Standard User shared dashboard PRD.
